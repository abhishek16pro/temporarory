import redisConnect from "../utils/redisConnect.js";
import ApiResponse from "../../shared/utils/apiResponse.js";
import * as position from '../controllers/positions.js'
import Account from '../models/account.js'
import dotenv from "dotenv";
dotenv.config();
const freezeMap = {
    BANKNIFTY: parseInt(process.env.BNFREEZE),
    NIFTY: parseInt(process.env.NFFREEZE),
    FINNIFTY: parseInt(process.env.FNFREEZE),
    MIDCPNIFTY: parseInt(process.env.MCNFREEZE),
    SENSEX: parseInt(process.env.SXFREEZE),
};

export const pushIntoRedis = async (req, res) => {
    try {
        const orderData = req.body;
        const redisClient = redisConnect();

        // Get freeze quantities from env

        for (let data of orderData) {
            const index = data.Index?.toUpperCase();
            const freezeQty = freezeMap[index];

            if (data.Quantity === 0) continue;

            let absQty = Math.abs(data.Quantity);
            let sign = data.Quantity > 0 ? -1 : 1;

            // Split into chunks
            while (absQty > 0) {
                const chunkQty = Math.min(absQty, freezeQty) * sign;
                const chunkOrder = { ...data, Quantity: chunkQty, status: "New" };
                // console.log("Pushing to Redis", chunkOrder);
                await redisClient.lpush("SqoffProcessQueue", JSON.stringify(chunkOrder));
                absQty -= Math.abs(chunkQty);
            }
        }

        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "Position going to Sq-Off",
                data: orderData,
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



export const sqoffByClientCode = async (req, res) => {
    try {
        const body = req.body;
        const redisClient = redisConnect();

        let acc = await Account.findOne({ userId: body.clientCode });
        if (acc) {
            let runningPosition = await position.fetchAndSavePositions(acc.userId, acc.brokerUrl);
            for (let pos in runningPosition) {
                const posData = runningPosition[pos];
                const qty = parseInt(posData.quantity);
                if (qty !== 0) {
                    // Determine index for freeze quantity
                    let index = posData.index || posData.Index || ""; // Try both lowercase and uppercase
                    index = index.toUpperCase();
                    const freezeQty = freezeMap[index];

                    let absQty = Math.abs(qty);
                    let sign = qty > 0 ? -1 : 1;

                    // Split into chunks
                    while (absQty > 0) {
                        const chunkQty = Math.min(absQty, freezeQty || absQty) * sign;
                        let orderData = {
                            "AccountID": posData.accountID,
                            "ExchangeInstrumentId": posData.exchangeInstrumentId,
                            "exchangeSegment": posData.exchangeSegment,
                            "Quantity": chunkQty,
                            "Index": index,
                            "status": "New"
                        };
                        await redisClient.lpush("SqoffProcessQueue", JSON.stringify(orderData));
                        absQty -= Math.abs(chunkQty);
                    }
                }
            }
        }
        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "Position going to Sq-Off",
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