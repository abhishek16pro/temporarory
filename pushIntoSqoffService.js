import redisConnect from "./utils/redisConnect.js";
let redisClient = redisConnect();

let position = {
    "AccountID": "PRO18",
    "ExchangeInstrumentId": "38638",
    "exchangeSegment": "NSEFO",
    "Quantity": -75,
    "status": "New"
}
let redisQueue = "SqoffProcessQueue"
await redisClient.lpush(redisQueue, JSON.stringify(position));
