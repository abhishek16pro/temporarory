import cron from "node-cron";
import mongoose from "mongoose";
import Redis from "ioredis";
import Account from "./models/account.js";
import redisConnect from "./utils/redisConnect.js";
import connectDB from "./utils/connectMongo.js";

// --- MongoDB Setup ---
// await connectDB()

// --- Redis Setup ---

// --- Core Job Function ---
async function pushClientsToRedis() {
  const redisClient = redisConnect();
  console.log("🔄 Syncing clients into Redis...");

  try {
    const clients = await Account.find({userId: { $ne: "SIM" }});
    console.log(clients);
    
    const formattedClients = clients
    .map((client) => ({
      active: client.active ?? true,
      clientId: client.userId,
      multiplier: client.multiplier,
      orderUrl: client.brokerUrl,
      isDealer: client.isDealer,
    }));

    // clear old list first (avoid duplicates)
    await redisClient.del("clients");

    if (formattedClients.length > 0) {
      const values = formattedClients.map((c) => JSON.stringify(c));
      await redisClient.rpush("clients", values);
    }

    console.log(`✅ Pushed ${formattedClients.length} clients into Redis list.`);
  } catch (err) {
    console.error("❌ Error syncing clients:", err);
  }
}

// --- Manual trigger for testing ---
export async function runNow() {
  await pushClientsToRedis();
}

// If you want to run once immediately when script starts
if (process.argv.includes("--now")) {
  runNow().then(() => {
    console.log("Finished manual sync ✅");
    process.exit(0);
  });
}

export default pushClientsToRedis