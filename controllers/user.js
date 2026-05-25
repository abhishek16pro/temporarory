// Data base error have to handle like unique email id if registered then error and all other thing's
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Admin from "../models/user.js";
import Account from "../models/account.js";
import crypto from "crypto";
import dotenv from "dotenv";
import ApiResponse from "../../shared/utils/apiResponse.js";
import { axiosFetch, encrypt, updateEnv, decrypt } from "../utils/index.js";
import User from "../models/user.js";
import Strategy from "../models/strategy.js";
import brokerList from "../models/brokerList.js";
import { saveLog } from "../utils/saveLog.js";
import redisConnect from "../utils/redisConnect.js";
import SimOrderDetails from "../models/simOrderDetails.js";
import StgTag from "../models/tag.js";


dotenv.config();

const redisClient = redisConnect();

const config = {
    headers: {
        Authorization: "",
        "Content-Type": "application/json"
    }
};

export const adminadd = async (req, res) => {
    try {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return new ApiResponse({
                    success: false,
                    statusCode: 422,
                    message: "Send the complete details",
                });
            }
            const salt = await bcrypt.genSalt();
            const passwordhash = await bcrypt.hash(password, salt);
            const newAdmin = new Admin({
                email: email,
                password: passwordhash,
            });
            await newAdmin.save();
            return res.send(
                new ApiResponse({
                    success: true,
                    statusCode: 201,
                    message: "Created",
                }).toObject(),
            );
        } catch (error) {
            console.log(error.message);
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 403,
                    message: error.message,
                }).toObject(),
            );
        }
    } catch (error) {
        console.log(error.message);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: error.message,
            }).toObject(),
        );
    }
};

export const newClient = async (req, res) => {
    try {
        const updates = req.body;

        console.log("Received updates:", updates);

        const allowedFields = [
            "firstName",
            "lastName",
            "userId",
            "password",
            "appKey",
            "secretKey",
            "maxLoss",
            "maxProfit",
            "mapped",
            "multiplier",
            "brokerName",
            "brokerUrl",
            "isDealer"
        ];

        const updatedFields = {};

        if (!updates.userId || !updates.secretKey || !updates.appKey) {
            return res.status(400).send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Access Denied, userId, secretKey and appKey is required",
                }).toObject()
            );
        }

        for (const field of allowedFields) {
            if (updates[field]) {
                updatedFields[field] = updates[field];
            }
        }

        const broker = await brokerList.findOne({
            brokerName: updates.brokerName,
        });

        if (!broker) {
            console.error("Broker not found for brokerName:", updates.brokerName);
            return res.status(404).send(
                new ApiResponse({
                    success: false,
                    statusCode: 404,
                    message: "Broker not found",
                }).toObject()
            );
        }

        updatedFields["brokerUrl"] = broker.brokerUrl;

        const newAccount = new Account(updatedFields);

        try {
            await newAccount.save();
        } catch (saveError) {
            console.error("Error saving new account:", saveError.message);
            return res.status(500).send(
                new ApiResponse({
                    success: false,
                    statusCode: 500,
                    message: "Failed to save account",
                }).toObject()
            );
        }
        return res.status(201).send(
            new ApiResponse({
                success: true,
                statusCode: 201,
                message: "Account added successfully",
            }).toObject()
        );
    } catch (error) {
        console.error("Unexpected error in newClient:", error.message);
        return res.status(500).send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: "Internal Server Error",
            }).toObject()
        );
    }
};

export const clientUpdate = async (req, res) => {
    try {
        const userId = req.params.userId;
        const updates = req.body;

        if (!userId) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Access Denied, UserId is required",
                }).toObject(),
            );
        }

        const allowedFields = [
            "firstName",
            "lastName",
            "userId",
            "password",
            "appKey",
            "secretKey",
            "maxLoss",
            "maxProfit",
            "mapped",
            "multiplier",
            "parent",
            "brokerName",
            "brokerUrl",
            "isDealer"
        ];
        const updatedFields = {};

        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                updatedFields[field] = updates[field];
            }
        }

        if (!Object.keys(updatedFields).length) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "No valid fields to update provided.",
                }).toObject(),
            );
        }

        if (updates.parent !== undefined) {
            await Account.updateMany({ parent: true }, { $set: { parent: false } });
            await Account.findOneAndUpdate(
                { userId: userId },
                { $set: { parent: true } },
                { new: true },
            );

            await Strategy.updateMany({}, { $set: { parentAcc: userId } });
        }

        if (updates.UserId && updates.multiplier !== undefined) {
            await Strategy.updateMany(
                { "mappedAccount.clientId": updates.UserId },
                {
                    $set: {
                        "mappedAccount.$.multiplier": updates.multiplier,
                    },
                },
            );
        }

        const updatedUser = await Account.findOneAndUpdate(
            { userId: userId },
            { $set: updatedFields },
            { new: true },
        );

        if (!updatedUser) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 404,
                    message: "User not found.",
                }).toObject(),
            );
        }

        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 201,
                message: `Details updated,New parent: ${updatedUser.userId}`,
                data: updatedUser,
            }).toObject(),
        );
    } catch (error) {
        console.error(error.message);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: error.message,
            }).toObject(),
        );
    }
};

export const getClients = async (req, res) => {
    try {
        try {
            const UserIds = await Account.find(
                {},
                {
                    userId: 1,
                    firstName: 1,
                    _id: 1,
                    multiplier: 1,
                    maxLoss: 1,
                    maxProfit: 1,
                    maxLossWaitSecond: 1,
                    mapped: 1,
                    active: 1,
                    parent: 1,
                    brokerUrl: 1,
                    isDealer: 1,
                    marginAvailable: 1,
                    marginUtilized: 1,
                    margin: 1,
                    updatedAt: 1
                },
            );

            return res.send(
                new ApiResponse({
                    success: true,
                    statusCode: 200,
                    message: "All UserId fetched",
                    data: UserIds
                }).toObject(),
            );
        } catch (error) {
            console.log(error.message);
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 403,
                    message: error.message,
                }).toObject(),
            );
        }
    } catch (error) {
        console.log(error.message);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: error.message,
            }).toObject(),
        );
    }
};

export const refreshUserMargin = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "userId is required",
                }).toObject(),
            );
        }

        const updatedAccount = await updateMarginForUser(userId);

        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: `Margin refreshed for ${userId}`,
                data: updatedAccount,
            }).toObject(),
        );
    } catch (error) {
        console.error("Error refreshing user margin:", error.message);

        // Determine status code based on error message
        let statusCode = 500;
        if (error.message.includes('not found')) {
            statusCode = 404;
        } else if (error.message.includes('inactive') || error.message.includes('auth token') || error.message.includes('balance data')) {
            statusCode = 400;
        }

        return res.status(statusCode).send(
            new ApiResponse({
                success: false,
                statusCode: statusCode,
                message: error.message,
            }).toObject(),
        );
    }
};

export const getClientsWithoutMargin = async (req, res) => {
    try {
        try {
            const UserIds = await Account.find(
                {},
                {
                    userId: 1,
                    firstName: 1,
                    _id: 1,
                    multiplier: 1,
                    maxLoss: 1,
                    maxProfit: 1,
                    maxLossWaitSecond: 1,
                    mapped: 1,
                    active: 1,
                    parent: 1,
                    brokerUrl: 1,
                    isDealer: 1
                },
            );

            return res.send(
                new ApiResponse({
                    success: true,
                    statusCode: 200,
                    message: "All UserId fetched without margin details",
                    data: UserIds
                }).toObject(),
            );
        } catch (error) {
            console.log(error.message);
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 403,
                    message: error.message,
                }).toObject(),
            );
        }
    } catch (error) {
        console.log(error.message);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: error.message,
            }).toObject(),
        );
    }
};

export const userDelete = async (req, res) => {
    try {
        const userId = req.params.userId;

        // console.log(userId);
        if (!userId) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Access Denied, UserId is required",
                }).toObject(),
            );
        }
        const user = await Account.findOneAndDelete({ userId });
        // console.log(user);
        if (!user) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 404,
                    message: "User Not found",
                }).toObject(),
            );
        }
        return res.send(
            new ApiResponse({
                success: true,
                message: `user ${userId} deleted`,
            }).toObject(),
        );
    } catch (error) {
        console.log(error.message);
        return res.send(
            new ApiResponse({
                success: false,
                message: error.message,
            }).toObject(),
        );
    }
};

export const adminlogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 422,
                    message: "Access Denied,Send the complete details",
                }).toObject(),
            );
        }
        const Admindata = await Admin.findOne({ email: email });
        if (!Admindata) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Access Denied",
                }).toObject(),
            );
        }
        const ismatch = await bcrypt.compare(password, Admindata.password);
        if (!ismatch) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Access Denied",
                }).toObject(),
            );
        }
        const currentDate = new Date();
        const endOfDay = new Date(currentDate);
        endOfDay.setHours(23, 59, 59, 999);
        const token = jwt.sign({ id: Admindata._id }, process.env.JWT_SECRET, {
            expiresIn: Math.floor((endOfDay - currentDate) / 1000),
        });
        res.cookie("jwt", token, {
            maxAge: 24 * 60 * 60 * 1000,
            httpOnly: true,
        });
        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 201,
                message: "token generated",
                data: token,
            }).toObject(),
        );
    } catch (error) {
        console.log(error.message);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: error.message,
            }).toObject(),
        );
    }
};

export const bulkStatus = async (req, res) => {
    try {
        const userIds = req.body.userIds;
        const newStatus = req.body.active;
        console.log(userIds, "userIds", newStatus, "newStatus");
        //1. active = true
        const updatedStatus = await Account.updateMany(
            { userId: { $in: userIds } },
            { $set: { active: newStatus } }
        );

        if (updatedStatus.nModified === 0) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 409,
                    message: "Access Denied, Nothing to update active status update conflict."
                }).toObject()
            );
        }
        // Exclude documents where userId is "SIM"
        const clients = await Account.find({
            userId: { $in: userIds, $ne: "SIM" }
        });
        // console.log("clients",clients);
        // Redis key (list), 0 → start index, -1 → end index 
        const clientsList = await redisClient.lrange("clients", 0, -1);

        for (const client of clients) {
            try {
                // First send the client to redis
                const clientObj = {
                    active: client.active ?? true,
                    clientId: client.userId,
                    multiplier: client.multiplier,
                    orderUrl: client.brokerUrl,
                    isDealer: client.isDealer,
                };

                const index = clientsList.findIndex(c => {
                    try {
                        return JSON.parse(c).clientId === client.userId;
                    } catch {
                        return false;
                    }
                });

                if (index !== -1) {
                    await redisClient.lset("clients", index, JSON.stringify(clientObj));
                } else {
                    await redisClient.rpush("clients", JSON.stringify(clientObj));
                }

                // Second make API call for token
                const body = {
                    secretKey: client.secretKey,
                    appKey: client.appKey,
                    source: "WEBAPI",
                };

                const url = `${client.brokerUrl}/interactive/user/session`;
                const { data } = await axiosFetch(url, "POST", {
                    "Content-Type": "application/json",
                }, body);

                console.log("data", data);

                const { token, clientCodes = [] } = data || {};
                if (token && clientCodes.length > 0) {
                    for (const clientCode of clientCodes) {
                        await redisClient.hset("auth", clientCode, token);
                        console.log(`Stored auth token for ${clientCode}`);
                    }
                }

            } catch (error) {
                console.error(`Failed for ${client.userId}:`, error.message);
            }
        }
        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 201,
                message: "New Status Updated",
                data: newStatus
            }).toObject()
        );
    } catch (error) {
        console.log(error.message);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: error.message
            }).toObject()
        );
    }
};


// export const bulkStatus = async (req, res) => {
//   try {

//     const userIds = req.body.userIds;
//     // if(!userIds || userIds.length === 0){
//     //     return res.status(400).json({"stat":"OK","Error":"Missing userIds","Verified":"true","message":"Access Denied, userIds is required for bulk Change"})
//     // }
// // console.log(userIds);

//     const newStatus = req.body.active;

//     const updatedStatus = await Account.updateMany(
//       { userId: { $in: userIds } },
//       { $set: { active: newStatus } },
//       { multi: true }
//     );

//     if (updatedStatus.nModified === 0) {
//       return res.send(
//         new ApiResponse({
//           success: false,
//           statusCode: 409,
//           message: "Access Denied, Nothing to update active status update conflict.",
//         }).toObject()
//       );
//     }

//     const stgs = await Strategy.find({});
//     // console.log(stgs,"stgs");

//     // console.log(stg[0].mappedAccount);
//     const brokerListArr = await brokerList.find({}, { _id: 0, brokerName: 1, brokerUrl: 1 });
//     const newBrokerUrlMap = brokerListArr.reduce((acc, curr) => {
//       acc[curr.brokerName] = curr.brokerUrl;
//       return acc;
//     }, {});
//     for (const stg in stgs) {
//       let mappedAccount = [];
//       const account = await Account.find({ active: true });
//       for (const acc in account) {
//         let obj = {};
//         obj["active"] = account[acc].active;
//         obj["clientId"] = account[acc].userId;
//         obj["multiplier"] = account[acc].multiplier;
//         obj["orderUrl"] = newBrokerUrlMap[account[acc].brokerName];
//         mappedAccount.push(obj);

//         console.log(mappedAccount);

//       }
//       stgs[stg].mappedAccount = mappedAccount;
//       // console.log(stgs[stg]);
//       await Strategy.updateOne(
//         { _id: stgs[stg]._id },
//         { $set: { mappedAccount: mappedAccount } }
//       );
//     }

//     return res.send(
//       new ApiResponse({
//         success: true,
//         statusCode: 201,
//         message: "New Status Updated",
//         data: newStatus,
//       }).toObject()
//     );
//   } catch (error) {
//     console.log(error.message);
//     return res.send(
//       new ApiResponse({
//         success: false,
//         statusCode: 500,
//         message: error.message,
//       }).toObject()
//     );
//   }
// };

export const userDetails = async (req, res) => {
    try {
        const userId = req.params.userId;
        if (!userId) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Access Denied, UserId is required",
                }),
            );
        }
        const user = await Account.findOne(
            { userId },
            {
                _id: 1,
                firstName: 1,
                lastName: 1,
                email: 1,
                contactNumber: 1,
                userId: 1,
                maxLoss: 1,
                maxProfit: 1,
                maxLossWaitSecond: 1,
                mapped: 1,
                multiplier: 1,
            },
        );
        if (!user) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 404,
                    message: "User Not found",
                }).toObject(),
            );
        }
        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "found",
                data: user,
            }).toObject(),
        );
    } catch (error) {
        console.log(error.message);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: error.message,
            }).toObject(),
        );
    }
};

export const updateMarginForAllUsers = async () => {
    try {
        const users = await Account.find({userId: { $ne: "SIM" }},
            {
                userId: 1
            },
        )
        for (const user of users) {
            try {
                await updateMarginForUser(user.userId);
                await new Promise(resolve => setTimeout(resolve, 1000)); // Add a 1-second delay between users to avoid overwhelming the broker API
            } catch (error) {
                console.error(`❌ Failed to update margin for ${user.userId}: ${error.message}`);
            }
        }
    } catch (error) {
        console.error("Error in updateMarginForAllUsers:", error.message);
    }
};

const updateMarginForUser = async (userId) => {
    try {
        if (userId === "SIM") {
            throw new Error("Margin update not required for SIM user");
        }

        const user = await Account.findOne(
            { userId },
            {
                userId: 1,
                firstName: 1,
                _id: 1,
                multiplier: 1,
                maxLoss: 1,
                maxProfit: 1,
                maxLossWaitSecond: 1,
                mapped: 1,
                active: 1,
                parent: 1,
                brokerUrl: 1,
                isDealer: 1,
                marginAvailable: 1,
                marginUtilized: 1,
                margin: 1,
                updatedAt: 1
            },
        );

        if (!user) {
            throw new Error(`User ${userId} not found`);
        }

        if (!user.active) {
            throw new Error(`User ${userId} is inactive`);
        }

        const authToken = await redisClient.hget("auth", userId);
        if (!authToken) {
            throw new Error(`No auth token found for user ${userId}`);
        }

        config.headers.Authorization = authToken;
        const { data: { BalanceList } } = await axiosFetch(
            `${user.brokerUrl}/interactive/user/balance?clientID=${user.userId}`,
            'GET',
            config
        );

        if (!BalanceList || !BalanceList[0] || !BalanceList[0].limitObject) {
            throw new Error(`BROKER:ERROR No balance data found for user ${userId}`);
        }

        const marginObj = BalanceList[0].limitObject.RMSSubLimits || {};

        const updatedAccount = await Account.findOneAndUpdate(
            { userId: user.userId },
            {
                $set: {
                    marginAvailable: marginObj.netMarginAvailable ?? -1,
                    marginUtilized: marginObj.marginUtilized ?? -1,
                    margin: marginObj.cashAvailable ?? -1,
                },
            },
            { new: true }
        );

        return updatedAccount;
    } catch (error) {
        console.error(`Error updating margin for ${userId}:`, error.message);
        throw error;
    }
};

export const updateMarginForIndividualUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const updatedAccount = await updateMarginForUser(userId);

        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: `Margin updated for ${userId}`,
                data: updatedAccount,
            }).toObject()
        );
    } catch (error) {
        console.error(`Margin update failed for ${req.params.userId}:`, error.message);

        // Determine status code based on error message
        let statusCode = 500;
        if (error.message.includes('not found')) {
            statusCode = 404;
        } else if (error.message.includes('inactive') || error.message.includes('auth token') || error.message.includes('balance data')) {
            statusCode = 400;
        }

        return res.status(statusCode).send(
            new ApiResponse({
                success: false,
                statusCode: statusCode,
                message: error.message,
            }).toObject()
        );
    }
};

export const reconcileMappedClients = async (req, res) => {
    try {
        // 1. Fetch all tags with their mapped accounts
        const tags = await StgTag.find({}).lean();
        const reconciled = []
        for (const tagDoc of tags) {
            const { tag, mappedAccount = [] } = tagDoc;

            //   if (!tag || tag.toUpperCase() === "SIM") continue;
            // 2. Update simOrderDetails docs with this tag
            const simRes = await SimOrderDetails.updateMany(
                { stgTag: tag },
                { $set: { mappedClients: mappedAccount } }
            );
            console.log(simRes);

            // --- Push reconciliation result for this tag ---
            reconciled.push({
                tag,
                reconciledClients: mappedAccount,
                updatedSimOrders: simRes.modifiedCount,
            });
        }

        console.log("✅ Reconciliation completed");
        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "Reconciliation completed",
                data: reconciled,
            }).toObject(),
        );
    } catch (error) {
        console.error("❌ Reconciliation failed:", error);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: error.message,
            }).toObject(),
        );
    }
}

export const singleClientSqoff = async (req, res) => {
    const { clientId } = req.body;

    if (!clientId) {
        return res.status(400).send(
            new ApiResponse({
                success: false,
                statusCode: 400,
                message: "Client ID is required",
            }).toObject()
        );
    }

    try {
        const start = Date.now();

        const [simResult, tagResult, strategyResult] = await Promise.all([
            SimOrderDetails.updateMany(
                { "mappedClients.clientId": clientId },
                { $pull: { mappedClients: { clientId } } }
            ),

            StgTag.updateMany(
                { "mappedAccount.clientId": clientId },
                { $pull: { mappedAccount: { clientId } } }
            ),

            Strategy.updateMany(
                { "mappedAccount.clientId": clientId },
                { $pull: { mappedAccount: { clientId } } }
            ),
        ]);

        const duration = Date.now() - start;

        return res.status(200).send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: `Successfully removed client ${clientId} from all related documents.`,
                data: {
                    durationMs: duration,
                    collectionsUpdated: {
                        simOrderDetails: simResult.modifiedCount,
                        stgTag: tagResult.modifiedCount,
                        strategy: strategyResult.modifiedCount,
                    },
                },
            }).toObject()
        );
    } catch (error) {
        console.error("singleClientSqoff error:", error);
        return res.status(500).send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: "Error during the data processing",
                error: error.message,
            }).toObject()
        );
    }
};