import StrategySchema from "../models/strategy.js";
import StgTag from "../models/tag.js";
import Account from "../models/account.js";
import ApiResponse from "../../shared/utils/apiResponse.js";
import redisConnect from "../utils/redisConnect.js";
import { getConnectionDetails } from "../utils/redisConnect.js";
import { Queue, Worker } from "bullmq";
import getExpiryDate from "../utils/getExpiryDate.js";
import { ObjectId } from "mongodb";
import { saveLog } from "../../shared/utils/saveLogs.js";
import { REDIS_MESSAGES } from "../../shared/constants/redisConstant.js";



const client = redisConnect();
const allowedLegFields = [
      "leg1",
      "leg2",
      "leg3",
      "leg4",
      "leg5",
      "leg6",
      "leg7",
      "leg8",
      "leg9",
      "leg10",
      "leg11",
      "leg12",
];

const simAccountObj = {
      active: true,
      clientId: "SIM",
      multiplier: 1,
      orderUrl: "SIM",
};

export const addStrategy = async (req, res) => {
      try {
            const strategyData = req.body;
            console.log("Data From ui", strategyData);
            if (!strategyData) {
                  return res.send(
                        new ApiResponse({
                              success: false,
                              statusCode: 400,
                              message: "Access Denied, Strategy data is required",
                        }).toObject(),
                  );
            }
            const availFields = await processStrategy(strategyData)
            ////// SIM ACCOUNT OBJECT /////////

            if (availFields.tag === "SIM") {
                  availFields.mappedAccount = [simAccountObj];
                  availFields.parentAcc = simAccountObj.clientId;
            }
            let savedStrategy;
            // IF strategyData.onStopLoss === "Execute Same Portfolio" Then we are making a copy of strategy with different name and id of that stg will be go inside the stg which comes from ui and stg type will be Dependent
            if (strategyData.onStopLoss === "Execute Same Portfolio") {
                  let id;
                  for (let i = 0; i <= strategyData.onLossBooking; i++) {
                        if (i === 0) {
                              // We are deleteing field name onLossBooking because we don't need in the last strategy
                              let copyOfAvailField = JSON.parse(JSON.stringify(availFields));
                              copyOfAvailField.onLossBooking = null;
                              copyOfAvailField.name = `${availFields.name}_${strategyData.onLossBooking - i
                                    }`;
                              copyOfAvailField.type = "Dependent";
                              const copyNewStrategy = new StrategySchema(copyOfAvailField);
                              console.log("Copy", copyOfAvailField.name, copyNewStrategy._id);
                              id = copyNewStrategy._id;
                              savedStrategy = await copyNewStrategy.save();
                        } else if (i == strategyData.onLossBooking) {
                              availFields["onLossBooking"] = id;
                              const newStrategy = new StrategySchema(availFields);
                              console.log("Original", newStrategy.name);
                              savedStrategy = await newStrategy.save();
                        } else {
                              let copyOfAvailField = JSON.parse(JSON.stringify(availFields));
                              copyOfAvailField.name = `${availFields.name}_${strategyData.onLossBooking - i
                                    }`;
                              copyOfAvailField.type = "Dependent";
                              copyOfAvailField["onLossBooking"] = id;
                              const copyNewStrategy = new StrategySchema(copyOfAvailField);
                              console.log("Copy", copyOfAvailField.name, copyNewStrategy._id);
                              id = copyNewStrategy._id;
                              savedStrategy = await copyNewStrategy.save();
                        }
                  }
            } else {
                  const fixedObjectId = new ObjectId();
                  for (const field of allowedLegFields) {
                        const leg = availFields[field];
                        if (leg && Array.isArray(leg.onStopLossExecute) && leg.onStopLossExecute.includes("SELF")) {
                              leg.onStopLossExecute = [fixedObjectId];
                        }
                        if (leg && Array.isArray(leg.onTakeProfitExecute) && leg.onTakeProfitExecute.includes("SELF")) {
                              leg.onTakeProfitExecute = [fixedObjectId];
                        }
                        if (leg && Array.isArray(leg.onStopLossSqoff) && leg.onStopLossSqoff.includes("SELF")) {
                              leg.onStopLossSqoff = [fixedObjectId];
                        }
                        if (leg && Array.isArray(leg.onTakeProfitSqoff) && leg.onTakeProfitSqoff.includes("SELF")) {
                              leg.onTakeProfitSqoff = [fixedObjectId];
                        }
                  }
                  availFields._id = fixedObjectId;
                  const newStrategy = new StrategySchema(availFields);
                  savedStrategy = await newStrategy.save();

            }
            // console.log("Saved Strategy", savedStrategy);

            return res.send(
                  new ApiResponse({
                        success: true,
                        statusCode: 200,
                        message: "Strategy saved successfully",
                        data: savedStrategy, // Include the saved strategy data in the response
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



export const sqoffStg = async (req, res) => {
      try {
            const _id = req.params._id;
            const updateKey = `SQOFF:${_id}`;
            await client.set(updateKey, JSON.stringify({ message: REDIS_MESSAGES.STRATEGY_MANUAL_SQOFF }));
            await client.expire(updateKey, 300);
            // Send the list of strategies as a JSON response
            return res.send(
                  new ApiResponse({
                        success: true,
                        statusCode: 200,
                        message: "Successfully SqOff successfully",
                  }).toObject(),
            );
      } catch (error) {
            console.log(error);
            return res.send(
                  new ApiResponse({
                        success: false,
                        statusCode: 500,
                        message: "Error during the data processing",
                  }).toObject(),
            );
      }
};
export const strategyList = async (req, res) => {
      try {
            const { runOnDays } = req.query;
            // console.log(runOnDays);

            const runOnDaysArray = runOnDays ? runOnDays.split(",").map(Number) : [];
            // console.log(runOnDaysArray,"runondays");

            let query = {};
            if (runOnDaysArray.length > 0) {
                  query.runOnDay = { $in: runOnDaysArray };
            }
            // Use Mongoose to find all strategies in the database
            const strategyList = await StrategySchema.find(query, '_id loaded status name startTime endTime runOnDay index tag');
            // console.log(strategyList);
            // Check if no strategies were found
            if (strategyList.length === 0) {
                  return res.send(
                        new ApiResponse({
                              success: false,
                              statusCode: 404,
                              message: "No strategies found in the database",
                              data: [],
                        }).toObject(),
                  );
            }

            // Send the list of strategies as a JSON response
            return res.send(
                  new ApiResponse({
                        success: true,
                        statusCode: 200,
                        message: "Successfully retrieved strategy list",
                        data: strategyList,
                  }).toObject(),
            );
      } catch (error) {
            console.log(error);
            return res.send(
                  new ApiResponse({
                        success: false,
                        statusCode: 500,
                        message: "Error during the data processing",
                  }).toObject(),
            );
      }
};

export const strategyData = async (req, res) => {
      try {
            const _id = req.params._id;
            if (!_id) {
                  return res.send(
                        new ApiResponse({
                              success: false,
                              statusCode: 400,
                              message: "Access Denied, Strategy Id is required",
                        }).toObject(),
                  );
            }
            const StrategyD = await StrategySchema.findById(_id);

            if (!StrategyD) {
                  return res.send(
                        new ApiResponse({
                              success: false,
                              statusCode: 404,
                              message: "Strategy with the given ID was not found",
                        }).toObject(),
                  );
            }

            return res.send(
                  new ApiResponse({
                        success: true,
                        statusCode: 200,
                        message: "Successfully retrieved strategy",
                        data: StrategyD,
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

// const scheduledJobsMap = new Map();
const { host, port, password } = getConnectionDetails();

const connection = {
      host: host,
      port: port,
      password: password,
};
const strategyQueue = new Queue("strategyQueue", { connection });

export const loadStrategy = async (req, res) => {
      try {
            const _id = req.params._id;

            const stg = await StrategySchema.findOne({ _id: _id, loaded: false });
            if (!stg) {
                  return res.send(
                        new ApiResponse({
                              success: false,
                              statusCode: 404,
                              message: `Strategy with ID ${_id} not found or already loaded.`,
                        }).toObject()
                  );
            }

            const currentTime = new Date().toLocaleTimeString("en-US", { hour12: false });
            const currentDay = new Date().getDay();
            console.log("curr day =>", currentDay, "stg runOnDay =>", stg?.runOnDay);

            if (stg.type === "TimeWise") {
                  if (stg.runOnDay.includes(currentDay)) {
                        stg.loaded = true;
                        stg.status = "Waiting";
                        await stg.save();

                        const timeString = stg.startTime;

                        if (timeString >= currentTime) {
                              const updatedTime = subtractTwoSeconds(stg.startTime);

                              const targetDate = new Date();
                              targetDate.setHours(
                                    updatedTime.newHours,
                                    updatedTime.newMinutes,
                                    updatedTime.newSeconds
                              );

                              const delay = targetDate.getTime() - Date.now();

                              console.log("Scheduling strategy", stg.name, "with delay:", delay);

                              await strategyQueue.add(
                                    "executeStrategy",
                                    { strategyId: stg._id },
                                    { jobId: stg._id.toString(), delay }
                              );
                        } else {
                              await client.lpush("rotateStrategy", JSON.stringify(stg));
                              stg.status = "Running";
                              await stg.save();
                              console.log("Directly pushing into queue", stg.name, new Date());
                        }
                  } else {
                        console.log("Strategy is not going to run today");
                  }
            }

            return res.send(
                  new ApiResponse({
                        success: true,
                        statusCode: 200,
                        message: "Strategy Scheduled",
                        data: _id,
                  }).toObject()
            );
      } catch (error) {
            console.log(error);
            return res.send(
                  new ApiResponse({
                        success: false,
                        statusCode: 500,
                        message: error.message,
                  }).toObject()
            );
      }
};

export const unloadStrategy = async (req, res) => {
      try {
            const _id = req.params._id;

            const stg = await StrategySchema.findOne({ _id: _id });
            if (!stg) {
                  return res.send(
                        new ApiResponse({
                              success: false,
                              statusCode: 404,
                              message: `Strategy with ID ${_id} not found`,
                        }).toObject()
                  );
            }

            console.log(_id, stg.name, "Unloading strategy");
            // if strategy status is waiting and stratime passed then send message with with status code not allowed to unload strategy because its already in queue and going to execute soon
            if (stg.status === "Waiting"  && stg.startTime <= new Date().toLocaleTimeString("en-US", { hour12: false })) {
                  return res.send(
                        new ApiResponse({
                              success: false,
                              statusCode: 400,
                              message: `${stg.name} is already in the queue and cannot be unloaded`,
                        }).toObject()
                  );
            }

            stg.loaded = false;
            stg.status = "Stopped";
            await stg.save();

            const job = await strategyQueue.getJob(_id.toString());
            if (job) {
                  await job.remove();
                  console.log(`Job for strategy ${_id} removed successfully from ${strategyQueue.name}`);

                  return res.send(
                        new ApiResponse({
                              success: true,
                              statusCode: 200,
                              message: `Job for ${stg.name} removed successfully from ${strategyQueue.name}`,
                        }).toObject()
                  );
            } else {
                  console.log(`Job for strategy ${_id} not found in ${strategyQueue.name}`);
                  return res.send(
                        new ApiResponse({
                              success: false,
                              statusCode: 404,
                              message: `Job for strategy ${_id} not found in ${strategyQueue.name}`,
                        }).toObject()
                  );
            }
      } catch (error) {
            console.log(error.message);
            return res.send(
                  new ApiResponse({
                        success: false,
                        statusCode: 500,
                        message: error.message,
                  }).toObject()
            );
      }
};



export const loadAllStrategy = async (req, res) => {
      try {
            const strategies = await StrategySchema.find({ loaded: false });
            const currentTime = new Date().toLocaleTimeString("en-US", { hour12: false });
            const currentDay = new Date().getDay();

            for (let i = 0; i < strategies.length; i++) {
                  const stg = strategies[i];

                  if (stg.type === "TimeWise") {
                        if (stg.runOnDay.includes(currentDay)) {
                              stg.loaded = true;
                              stg.status = "Waiting";
                              await stg.save();

                              const timeString = stg.startTime;

                              if (timeString >= currentTime) {
                                    const updatedTime = subtractTwoSeconds(stg.startTime);

                                    const targetDate = new Date();
                                    targetDate.setHours(
                                          updatedTime.newHours,
                                          updatedTime.newMinutes,
                                          updatedTime.newSeconds,
                                    );

                                    const delay = targetDate.getTime() - Date.now();
                                    console.log("Scheduling strategy", stg.name, "with delay:", delay);

                                    await strategyQueue.add(
                                          "executeStrategy",
                                          { strategyId: stg._id, stg: stg.name },
                                          { jobId: stg._id.toString(), delay },
                                    );
                              } else {
                                    // await strategyQueue.add("rotateStrategy", { strategyId: stg._id });
                                    await client.lpush("rotateStrategy", JSON.stringify(stg));
                                    stg.status = "Running";
                                    await stg.save();
                                    console.log("Directly pushing into queue", stg.name);
                              }
                        } else {
                              console.log("Strategy is not going to run today");
                        }
                  }
            }

            return res.send(
                  new ApiResponse({
                        success: true,
                        statusCode: 200,
                        message: "Strategies Scheduled",
                  }).toObject(),
            );
      } catch (error) {
            console.log(error);
            return res.send(
                  new ApiResponse({
                        success: false,
                        statusCode: 500,
                        message: error.message,
                  }).toObject(),
            );
      }
};

new Worker(
      "strategyQueue",
      async (job) => {
            console.log("Executing strategy:", job.data.strategyId);
            await myScheduledFunction(job.data.strategyId);
      },
      { connection }
);


export const deleteStrategy = async (req, res) => {
      // console.log(req);

      try {
            const { id } = req.body
            console.log(id);
            let deletedStrategy
            if (id) {
                  deletedStrategy = await StrategySchema.deleteOne({ _id: id })
            } else {
                  deletedStrategy = await StrategySchema.deleteMany({})
            }
            console.log(deletedStrategy)
            return res.status(200).json({
                  stat: "OK",
                  Error: "",
                  Verified: true,
                  message: "Strategy Deleted",
                  strategy: deletedStrategy,
            })

      } catch (error) {
            console.log(error.message);
            return res.status(500).json({
                  stat: "OK",
                  Error: error.message,
                  Verified: true,
                  message: "error occurred during deletion",
            });
      }
}

function getObjectDiff(obj1, obj2) {
      let changes = {};

      const keys = new Set([
            ...Object.keys(obj1 || {}),
            ...Object.keys(obj2 || {})
      ]);

      for (let key of keys) {
            const val1 = obj1 ? obj1[key] : undefined;
            const val2 = obj2 ? obj2[key] : undefined;

            // If both are objects → recurse
            if (
                  typeof val1 === "object" &&
                  typeof val2 === "object" &&
                  val1 !== null &&
                  val2 !== null &&
                  !Array.isArray(val1) &&
                  !Array.isArray(val2)
            ) {
                  const nestedDiff = getObjectDiff(val1, val2);

                  if (Object.keys(nestedDiff).length > 0) {
                        changes[key] = nestedDiff;
                  }
            }

            // Arrays
            else if (Array.isArray(val1) || Array.isArray(val2)) {
                  if (JSON.stringify(val1) !== JSON.stringify(val2)) {
                        changes[key] = val2;
                  }
            }

            // Primitive values
            else if (val1 !== val2) {
                  changes[key] = val2;
            }
      }

      return changes;
}

export const updateStrategy = async (req, res) => {
      try {
            const strategyData = req.body;
            // console.log(strategyData, "strategyData");

            const _id = req.params._id;
            if (!strategyData) {
                  return res.status(400).json({
                        stat: "OK",
                        Error: "Missing Strategy Id",
                        Verified: "true",
                        message: "Access Denied, Strategy Id is required",
                  });
            }
            if (!strategyData) {
                  return res.status(400).json({
                        stat: "OK",
                        Error: "Missing userId",
                        Verified: "true",
                        message: "Access Denied, Strategy data is required",
                  });
            }
            if (!strategyData.msg) {
                  return res.status(400).json({
                        stat: "OK",
                        Error: "Missing MSG",
                        Verified: "true",
                        message: "Msg field  is required",
                  });
            }
            const oldStrategy = await StrategySchema.findById(_id).lean();
            const availFields = await processStrategy(strategyData);
            // console.log(availFields, "availField");

            // Find and update the strategy by its _id
            const updatedStrategy = await StrategySchema.findByIdAndUpdate(_id, availFields, {
                  new: true,
                  runValidators: true,
            });
            // here i am calculating the diff before and after update and sening it into the redis list to update in real time when its running or waiting
            let changes = null;
            if (oldStrategy.status === "Running" || oldStrategy.status === "Waiting") {
                  const newStrategy = await StrategySchema.findById(_id).lean();
                  changes = getObjectDiff(oldStrategy, newStrategy);
                  const updateKey = `UPDATES:${_id}`;
                  let redisObj = {
                        _id: _id,
                        message: REDIS_MESSAGES.STRATEGY_UPDATE,
                        fieldUpdate: changes
                  };
                  saveLog(oldStrategy.name, "UPDATE", `Fields updated: ${JSON.stringify(changes)}`);
                  await client.rpush(updateKey, JSON.stringify(redisObj));
                  await client.expire(updateKey, 300); // Expire after 5 minutes
            }


            if (!updatedStrategy) {
                  return res.status(404).json({
                        stat: "OK",
                        Error: "Strategy not found",
                        Verified: true,
                        message: "Strategy with the given ID was not found",
                  });
            }

            return res.status(200).json({
                  stat: "OK",
                  Error: "",
                  Verified: true,
                  message: "Strategy updated successfully",
                  changes: changes
            });
      } catch (error) {
            console.log(error.message);
            return res.status(500).json({
                  stat: "OK",
                  Error: error.message,
                  Verified: "true",
                  message: "error during the data processing",
            });
      }
};

function subtractTwoSeconds(timeString) {
      const [hours, minutes, seconds] = timeString.split(":");
      let totalSeconds = hours * 3600 + minutes * 60 + seconds * 1; // Convert to total seconds
      totalSeconds -= 2; // Subtract two seconds

      // Ensure the result is not negative
      if (totalSeconds < 0) {
            totalSeconds = 0;
      }

      const newHours = Math.floor(totalSeconds / 3600);
      const newMinutes = Math.floor((totalSeconds % 3600) / 60);
      const newSeconds = totalSeconds % 60;

      return {
            newHours,
            newMinutes,
            newSeconds,
      };
}

async function myScheduledFunction(_id) {
      let StrategyList = await StrategySchema.findOne({ _id: _id });

      const queueName = "rotateStrategy";
      if (StrategyList.type === "TimeWise") {
            try {
                  console.log(`Running ${StrategyList.name} at ${new Date()}`);
                  await client.lpush(queueName, JSON.stringify(StrategyList));
                  StrategyList.status = "Running";
                  await StrategyList.save();
            } catch (error) {
                  console.log(error);
            }
      }
}

export const updateTag = async (req, res) => {
      try {
            const tagData = req.body;

            if (!tagData || !tagData.mappedAccount) {
                  return res.send(
                        new ApiResponse({
                              stat: "OK",
                              Error: "Missing data",
                              Verified: "true",
                              message: "Access Denied, Strategy data is required",
                        }),
                  );
            }

            const UpdateTag = await StgTag.updateOne(
                  { tag: tagData.tag },
                  { mappedAccount: tagData.mappedAccount },
            );

            const clientData = tagData.mappedAccount.map((account) => ({
                  clientId: account.clientId,
                  multiplier: account.multiplier,
            }));

            for (let ind = 0; ind < clientData.length; ind++) {
                  const cId = clientData[ind].clientId;
                  const multiplier = clientData[ind].multiplier;

                  const cred = await Account.findOne({ userId: cId });

                  if (!cred) {
                        console.log(`No account found for clientId: ${cId}`);
                        continue;
                  }

                  cred.multiplier = multiplier;
                  await cred.save();

                  await StrategySchema.updateMany(
                        { "mappedAccount.clientId": cId },
                        { $set: { "mappedAccount.$.multiplier": multiplier } },
                  );
            }

            return res.send(
                  new ApiResponse({
                        success: true,
                        statusCode: 201,
                        message: "Strategy Tag Updated successfully",
                        data: tagData,
                  }).toObject(),
            );
      } catch (error) {
            console.error("Error updating strategy tag:", error.message);
            return res.send(
                  new ApiResponse({
                        success: false,
                        statusCode: 500,
                        message: error.message,
                  }).toObject(),
            );
      }
};


export const stgTagList = async (req, res) => {
      try {
            // Use Mongoose to find all strategies in the database
            const strategyTagLists = await StgTag.find({}, { _id: 0, mappedAccount: 0 });

            // Check if no strategies were found
            if (strategyTagLists.length === 0) {
                  return res.send(
                        new ApiResponse({
                              success: false,
                              statusCode: 404,
                              message: "No strategies found in the database",
                        }).toObject(),
                  );
            }

            // Send the list of strategies as a JSON response
            return res.send(
                  new ApiResponse({
                        success: true,
                        statusCode: 200,
                        message: "Successfully retrieved strategy tag list",
                        data: strategyTagLists, // Array of strategies with _id and name fields
                  }).toObject(),
            );
      } catch (error) {
            console.log(error);
            return res.send(
                  new ApiResponse({
                        success: false,
                        statusCode: 500,
                        message: error.message,
                  }).toObject(),
            );
      }
};

export const sqOffByClientCode = async (req, res) => {
      try {
            const strategydata = req.body;

            if (!strategydata) {
                  return res.send(
                        new ApiResponse({
                              success: false,
                              statusCode: 404,
                              message: "No Data Found",
                        }).toObject(),
                  );
            }

            const allStrategy = await StrategySchema.find({ loaded: true }, "_id name loaded");

            for (let i in allStrategy) {
                  console.log(allStrategy[i]._id.toString(), strategydata);
                  await client.set(allStrategy[i]._id.toString(), JSON.stringify(strategydata), "EX", 300);
            }

            return res.send(
                  new ApiResponse({
                        success: true,
                        statusCode: 200,
                        message: "Client Going to SqOff",
                  }).toObject(),
            );
      } catch (error) {
            console.log(error.message);
            return res.send(
                  new ApiResponse({
                        success: "OK",
                        statusCode: 500,
                        message: error.message,
                  }).toObject(),
            );
      }
};


export const copyStrategy = async (req, res) => {
      try {
            const strategyData = req.body;

            if (!strategyData || !strategyData._id || !strategyData.name) {
                  return res.send(
                        new ApiResponse({
                              success: false,
                              statusCode: 400,
                              message: "Missing strategy data or required fields (_id, name).",
                        }).toObject()
                  );
            }

            const oldStgData = await StrategySchema.findOne({ _id: strategyData._id });
            if (!oldStgData) {
                  return res.send(
                        new ApiResponse({
                              success: false,
                              statusCode: 404,
                              message: "Original strategy not found.",
                        }).toObject()
                  );
            }

            let baseName = strategyData.name;
            let newName = baseName;
            let counter = 1;

            const nameMatch = baseName.match(/^(.*)-(\d+)$/);
            if (nameMatch) {
                  baseName = nameMatch[1]; // Extract the part before the last "-number"
                  counter = parseInt(nameMatch[2], 10) + 1; // Increment the existing number
            }

            while (await StrategySchema.findOne({ name: newName })) {
                  newName = `${baseName}-${counter}`;
                  counter++;
            }

            const newStrategyData = {
                  ...oldStgData.toObject(),
                  name: newName,
                  startTime: strategyData.startTime ? strategyData.startTime : oldStgData.startTime,
                  endTime: strategyData.endTime ? strategyData.endTime : oldStgData.endTime,
                  sqTime: strategyData.endTime ? strategyData.endTime : oldStgData.sqTime,
                  status: "Stopped",
                  loaded: false,
            };

            const fixedObjectId = new ObjectId();
            for (const field of allowedLegFields) {
                  const leg = newStrategyData[field];
                  if (!leg) continue;

                  const replaceSelfRefs = (arr) => {
                        if (!Array.isArray(arr)) return arr;
                        return arr.map((val) => {
                              if (val === "SELF") return fixedObjectId;
                              if (val && typeof val === "object" && typeof val.toString === "function" && val.toString() === oldStgData._id.toString()) return fixedObjectId;
                              if (typeof val === "string" && val === oldStgData._id.toString()) return fixedObjectId;
                              return val;
                        });
                  };

                  leg.onStopLossExecute = replaceSelfRefs(leg.onStopLossExecute);
                  leg.onTakeProfitExecute = replaceSelfRefs(leg.onTakeProfitExecute);
                  leg.onStopLossSqoff = replaceSelfRefs(leg.onStopLossSqoff);
                  leg.onTakeProfitSqoff = replaceSelfRefs(leg.onTakeProfitSqoff);
            }

            newStrategyData._id = fixedObjectId;

            const copiedStrategy = new StrategySchema(newStrategyData);
            await copiedStrategy.save();

            return res.send(
                  new ApiResponse({
                        success: true,
                        statusCode: 201,
                        message: "Strategy copied successfully!",
                        data: copiedStrategy,
                  }).toObject()
            );
      } catch (error) {
            return res.send(
                  new ApiResponse({
                        success: false,
                        statusCode: 500,
                        message: error.message,
                  }).toObject()
            );
      }
};

export const exportStrategy = async (req, res) => {
      try {
            const allstgs = await StrategySchema.find({}).lean();

            if (!allstgs || allstgs.length === 0) {
                  const apiResponse = new ApiResponse({
                        success: false,
                        statusCode: 404,
                        message: "No strategy data found",
                  });
                  return res.status(404).send(apiResponse.toObject());
            }

            const updatedStrategies = allstgs.map((strategy) => ({
                  ...strategy,
                  loaded: false,
                  status: "Stopped",
            }));

            let filename = req.query.filename;
            if (!filename) {
                  let indices = [...new Set(allstgs.map((strategy) => strategy.index))];
                  let indexPart = indices.length > 1 ? indices.join("_") + "_COMBINED" : indices[0];

                  const currentDate = new Date();
                  const day = currentDate.getDate().toString().padStart(2, "0");
                  const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
                  const year = currentDate.getFullYear();
                  filename = `XTS_stg_${indexPart}_${day}_${month}_${year}`;
            }

            if (!filename.toLowerCase().endsWith('.json')) {
                  filename += '.json';
            }

            const jsonData = JSON.stringify(updatedStrategies, null, 4);

            res.setHeader("Content-Type", "application/json");
            res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
            res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

            res.status(200).send(jsonData);
      } catch (error) {
            const apiResponse = new ApiResponse({
                  success: false,
                  statusCode: 500,
                  message: "An error occurred while exporting strategies",
                  error: error.message,
            });
            res.status(500).send(apiResponse.toObject());
      }
};

const processStrategy = async (strategyData) => {
      const availFields = {};
      const allowedFields = [
            "name",
            "type",
            "tag",
            "startTime",
            "index",
            "exitbuffervalue",
            "entrybuffervalue",
            "endTime",
            "sqTime",
            "runOnDay",
            "lossType",
            "loss",
            "onStopLoss",
            "onLossBooking",
            "onLossBookingSqOff",
            "profitType",
            "profit",
            "onProfit",
            "onProfitBooking",
            "onProfitBookingSqOff",
            "onCompletionExecute",
            "onCompletionSqoff",
            "rexOnCompletion",
            "rexDelay",
            "rexCondition",
            "onCompletionExecuteDelay",
            "diffPercentage",
            "minPoints",
            "minHoldTime",
            "whichLegSqoff",
            "action",
            "isCpRatioEnable",
            "upPortfolioOnTg",
            "downPortfolioOnTg",
            "upPortfolioOnSl",
            "downPortfolioOnSl",
            "onTargetType",
            "onTargetNoT",
            "onSLType",
            "onSLNoT",
            "combinedSlTrailAfter",
            "combinedSlTrailBy",
            "minVwapCheckGap",
            "minVwapCheckTimes",
            "minVwapDiff",
            "minDiffType",
            "isVwapEnabled",
            "isBuy",
            "isSell",
            "combinedVwapType",
            "startMonitoringPercentage",
            "monitorTime",
            "checkIntervalMinutes",
            "isOrbEnabled",
            "sellVwapType",
            "isCombinedEntry",
            "combinedEntryType",
            "combinedEntryValue",
            "combinedStrikeSelectionType",
            "combinedStrikeSelectionValue",
            "watchMinutes",
            "decayPercentage",
            "montoringStrikeType",
            "checkCombinedStrikeDecay",
            "lds",
            "dayHighLow",
            "ldsType",
            "ldsSLType",
            "ldsSlBuffer",
            "ldsAutoExit",
            "candleCloseLds",
            "ldsEntryBuffer",
            "ldsSmPercent",
            "ldsMonitorType",
            "monitoringStrikeValue",
            "rangeBuffer",
            "isDecayDrivenStraddle",
            "isRollingStraddleEnabled",
            "isStraddleValueDecay",
            "isStaticStrikeDecay",
            "straddleStrikeBasis",
            "strikeOffsetFromATM",
            "stdDecay",
            "combinedDecayType",
            "rangeArray",
            "doubleUnderlying"
      ];


      for (const field of allowedFields) {
            if (strategyData[field] !== undefined) {
                  availFields[field] = strategyData[field];
            }
      }
      console.log(`[Adding/Updating] combinedSlTrailAfter: ${availFields.combinedSlTrailAfter}, combinedSlTrailBy: ${availFields.combinedSlTrailBy}`);
      for (const field of allowedLegFields) {
            const isLegDeleted = strategyData[field] === false || !strategyData[field] || strategyData[field]?.added === false;
            if (isLegDeleted && (strategyData.log && strategyData.log[field]?.added)) {
                  availFields[field] = {
                        added: false,
                        idle: false
                  }
            } else if (isLegDeleted) {
                  availFields[field] = {
                        added: false,
                        idle: false
                  }
            } else {
                  availFields[field] = strategyData[field];
                  // console.log(availFields[field],"log");

            }
      }
      availFields.log = { ...strategyData.log };
      for (const field of allowedLegFields) {
            const isLegActive = strategyData[field] && strategyData[field] !== false && strategyData[field]?.added !== false;
            if (isLegActive) {
                  availFields.log[field] = {
                        ...(availFields.log[field] || {}),
                        added: true,
                        idle: strategyData[field].idle,
                        ...(strategyData[field].trailAfter && {
                              trailAfter: strategyData[field].trailAfter,
                              trailBy: strategyData[field].trailBy,
                        }),
                        ...(strategyData[field].rexCandleCloseTime && {
                              rexCandleCloseTime: strategyData[field].rexCandleCloseTime,
                              reExecuteTime: null,
                        }),
                  };

                  if (strategyData[field].wtCandleClose) {
                        const [hours, minutes, seconds] = strategyData.startTime.split(":");
                        const specificTime = new Date();
                        specificTime.setHours(hours, minutes, seconds);
                        availFields.log[field].lastCCEpochTime = Math.floor(specificTime.getTime() / 1000);
                  }
            } else {
                  availFields.log[field] = {
                        ...availFields.log[field],
                        added: false,
                        idle: false,
                        status: "Initial",
                        strikeSelected: "",
                        strikeValue: 0,
                        underlyingValue: 0,
                        stopLoss: 0,
                        target: 0,
                        legPnl: 0,
                        premiumPnl: 0,
                        orderId: "",
                        SlOrderId: { orderId: "", brokerUrl: "", clientId: "", isDealer: false },
                        slOrderList: [],
                        targetOrderId: "",
                        targetOrderList: [],
                        reExecuteTime: null,
                        legDelayEpochTime: 0
                  }
            }
      }
      const tagData = await StgTag.findOne({ tag: availFields.tag });
      if (tagData) {
            availFields.mappedAccount = tagData.mappedAccount;
            availFields.parentAcc = tagData.tagParentAccount;
      } else {
            availFields.mappedAccount = [
                  {
                        clientId: "SIM",
                        multiplier: 1,
                        active: true,
                        orderUrl: "",
                        isDealer: false,
                  }
            ];
            availFields.parentAcc = "SIM";
      }

      return availFields;
}

export const importStrategy = async (req, res) => {
      try {
            const { strategy: strategies } = req.body;
            if (!strategies || !Array.isArray(strategies)) {
                  return res.send(
                        new ApiResponse({
                              success: false,
                              statusCode: 400,
                              message: "Invalid strategy data. Expected an array of strategies.",
                        }).toObject()
                  );
            }
            const results = [];
            const errors = [];
            for (const strategyData of strategies) {
                  try {
                        const strategyToImport = { ...strategyData };
                        if (strategyToImport.createdAt && strategyToImport.createdAt.$date) {
                              strategyToImport.createdAt = new Date(strategyToImport.createdAt.$date);
                        }
                        if (strategyToImport.updatedAt && strategyToImport.updatedAt.$date) {
                              strategyToImport.updatedAt = new Date(strategyToImport.updatedAt.$date);
                        }
                        strategyToImport.loaded = false;
                        strategyToImport.status = "Stopped";
                        const existingStrategy = await StrategySchema.findOne({ name: strategyToImport.name });
                        if (existingStrategy) {
                              let currCopyNo = 1;
                              let newName = `${strategyToImport.name} - ${currCopyNo}`;
                              while (await StrategySchema.findOne({ name: newName })) {
                                    currCopyNo++;
                                    newName = `${strategyToImport.name} - ${currCopyNo}`;
                              }
                              strategyToImport.name = newName;
                        }
                        const newStrategy = new StrategySchema(strategyToImport);
                        const savedStrategy = await newStrategy.save();
                        results.push({
                              name: savedStrategy.name,
                              success: true,
                              message: "Successfully imported"
                        });
                  } catch (error) {
                        console.error('Strategy import error:', error);
                        errors.push({
                              name: strategyData.name || "Unknown Strategy",
                              success: false,
                              message: error.message
                        });
                  }
            }
            if (errors.length === 0) {
                  return res.send(
                        new ApiResponse({
                              success: true,
                              statusCode: 200,
                              message: "All strategies in chunk imported successfully",
                              data: { imported: results }
                        }).toObject()
                  );
            } else if (results.length === 0) {
                  return res.send(
                        new ApiResponse({
                              success: false,
                              statusCode: 400,
                              message: "Failed to import strategies in chunk",
                              data: { errors }
                        }).toObject()
                  );
            } else {
                  return res.send(
                        new ApiResponse({
                              success: true,
                              statusCode: 207,
                              message: "Some strategies in chunk imported successfully",
                              data: {
                                    imported: results,
                                    failed: errors
                              }
                        }).toObject()
                  );
            }
      } catch (error) {
            console.error("Import strategy error:", error);
            return res.send(
                  new ApiResponse({
                        success: false,
                        statusCode: 500,
                        message: "An error occurred while importing strategies",
                        error: error.message
                  }).toObject()
            );
      }
};

export const getUtilizedMargin = async (req, res) => {
      try {
            const cachedData = await client.get("utilizedMargin");
            if (cachedData) {
                  return res.send(
                        new ApiResponse({
                              success: true,
                              statusCode: 200,
                              message: "Utilized margin retrieved from cache",
                              data: JSON.parse(cachedData)
                        }).toObject()
                  );
            }
            const excludedStrategies = await StrategySchema.find({
                  $or: [
                        { name: { $regex: /HG|HEDGE/ } }, // Name contains "HG" or "HEDGE"
                        { type: { $ne: "TimeWise" } },   // Type is not "TimeWise"
                        // { tag: "SIM" }                  // Tag is "SIM"
                  ]
            });

            const allStrategies = await StrategySchema.find();
            const strategies = allStrategies.filter(strategy =>
                  !excludedStrategies.some(excluded => excluded._id.equals(strategy._id))
            );

            //     console.log(strategies.length, "strategies found after exclusion");
            let expiryDates;
            const expiryData = await client.lrange("tokenExpiry", 0, -1);
            if (!expiryData || expiryData.length === 0) {
                  await getExpiryDate();
                  const newExpiryData = await client.lrange("tokenExpiry", 0, -1);
                  const jsonData = newExpiryData.map(data => JSON.parse(data));
                  expiryDates = jsonData[0];
            } else {
                  const jsonData = expiryData.map(data => JSON.parse(data));
                  expiryDates = jsonData[0];
            }

            const currentDate = new Date().toISOString().split("T")[0];
            const tomorrowDate = new Date();
            tomorrowDate.setDate(tomorrowDate.getDate() + 1);
            const tomorrow = tomorrowDate.toISOString().split("T")[0];


            const marginData = {
                  NIFTY: { count: 0, totalMultiplier: 0, margin: 0, isExpiry: false },
                  BANKNIFTY: { count: 0, totalMultiplier: 0, margin: 0, isExpiry: false },
                  FINNIFTY: { count: 0, totalMultiplier: 0, margin: 0, isExpiry: false },
                  MIDCPNIFTY: { count: 0, totalMultiplier: 0, margin: 0, isExpiry: false },
                  SENSEX: { count: 0, totalMultiplier: 0, margin: 0, isExpiry: false }
            };

            strategies.forEach(strategy => {
                  if (strategy.index && marginData[strategy.index]) {
                        marginData[strategy.index].count += 1;
                        marginData[strategy.index].totalMultiplier += strategy.mappedAccount.reduce(
                              (sum, acc) => sum + (acc.multiplier || 1),
                              0
                        );
                  }
            });

            let totalMargin = 0;

            Object.entries(marginData).forEach(([index, data]) => {
                  const isExpiryToday = expiryDates[index] === currentDate;
                  data.isExpiry = isExpiryToday;

                  if (index === 'NIFTY') {
                        data.margin = data.totalMultiplier * (isExpiryToday ? 2.7 : 2.37);
                  } else if (index === 'SENSEX') {
                        data.margin = data.totalMultiplier * (isExpiryToday ? 2.7 : 2.37);
                  } else {
                        data.margin = data.totalMultiplier * 2.37;
                  }

                  totalMargin += data.margin;
            });
            await client.set("utilizedMargin", JSON.stringify({
                  indexWiseMargin: marginData,
                  totalMargin: parseFloat(totalMargin.toFixed(2))
            }), "EX", 10800);
            return res.send(
                  new ApiResponse({
                        success: true,
                        statusCode: 200,
                        message: "Margin calculation successful",
                        data: {
                              indexWiseMargin: marginData,
                              totalMargin: parseFloat(totalMargin.toFixed(2))
                        }
                  }).toObject()
            );

      } catch (error) {
            console.error("Error in getUtilizedMargin:", error);
            return res.send(
                  new ApiResponse({
                        success: false,
                        statusCode: 500,
                        message: "Error calculating margin",
                        error: error.message
                  }).toObject()
            );
      }
};

export const saveUpdatedFields = async (req, res) => {
      try {
            // const data = req.body;
            // const obj = {
            //       _id: data.strategyId,
            //       message: REDIS_MESSAGES.STRATEGY_UPDATE,
            //       fieldUpdate: filteredFields
            // };
            // const updateKey = `UPDATES:${data.strategyId}`;
            // await client.rpush(updateKey, JSON.stringify(obj));
            // await client.expire(updateKey, 300); // Expire after 1 hour
            return res.send(
                  new ApiResponse({
                        success: true,
                        statusCode: 200,
                        message: "will dump this function",
                  }).toObject(),
            );
      } catch (error) {
            console.error("Error saving updated fields:", error);
            return res.send(
                  new ApiResponse({
                        success: false,
                        statusCode: 500,
                        message: "Error saving field updates",
                        error: error.message
                  }).toObject(),
            );
      }
};

export const sqoffAllStg = async (req, res) => {
      const startTime = Date.now();

      try {
            const currentDay = new Date().getDay();

            const strategies = await StrategySchema.find(
                  { runOnDay: currentDay },
                  { _id: 1 }
            ).lean();

            if (!strategies.length) {
                  return res.send(
                        new ApiResponse({
                              success: true,
                              statusCode: 200,
                              message: `No strategies scheduled for day ${currentDay}`,
                              data: [],
                        }).toObject()
                  );
            }

            const pipeline = client.pipeline();
            for (const { _id } of strategies) {
                  const updateKey = `SQOFF:${_id}`;
                  await client.set(updateKey, JSON.stringify({ message: REDIS_MESSAGES.STRATEGY_MANUAL_SQOFF }));
                  await client.expire(updateKey, 300);
            }
            await pipeline.exec();

            const duration = Date.now() - startTime;

            return res.send(
                  new ApiResponse({
                        success: true,
                        statusCode: 200,
                        message: `Starting sqoff for ${strategies.length} strategies`,
                        data: {
                              count: strategies.length,
                              durationMs: duration,
                              day: currentDay,
                        },
                  }).toObject()
            );
      } catch (error) {
            console.error("sqoffAllStg error:", error);

            return res.status(500).send(
                  new ApiResponse({
                        success: false,
                        statusCode: 500,
                        message: "Failed to process manualSqoff request",
                        error: error.message,
                  }).toObject()
            );
      }
};