import mongoose from "mongoose";
import connectDB from "./connectMongo.js";
import redisConnect from "./redisConnect.js";

async function getExpiryDate() {
  try {
    await connectDB();
    const redisClient = await redisConnect();

    const tokenCollectionExists = await mongoose.connection.db
      .listCollections({ name: "token" })
      .hasNext();

    if (!tokenCollectionExists) {
      console.log("Token collection does not exist.");
      return;
    }

    const TokenModel = mongoose.connection.db.collection("token");
    const indexList = ["NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "SENSEX"];
    const redisKey = "tokenExpiry";
    const expiryData = {};

    for (const index of indexList) {
      const token = await TokenModel.findOne({ scripshortname: index });
      if (!token) {
        console.log(`No tokens found for ${index}`);
        continue;
      }

      const expiryTimestamp = token.expirydate;
      const formattedExpiry = new Date(expiryTimestamp)
        .toISOString()
        .split("T")[0];
      expiryData[index] = formattedExpiry;
    }

    if (Object.keys(expiryData).length > 0) {
      await redisClient.rpush(redisKey, JSON.stringify(expiryData));
      console.log("Expiry data saved to Redis:", expiryData);
    } else {
      console.log("No expiry data to save.");
    }

  } catch (error) {
    console.error("Error in getExpiryDate:", error);
  }
}

export default getExpiryDate;
