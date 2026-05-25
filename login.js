import mongoose from "mongoose";
import dotenv from "dotenv";
import { axiosFetch, getAllClients } from "./utils/index.js";
import { saveLog } from "../shared/utils/saveLogs.js";
import redisClient from "./utils/redisConnect.js";
import connectDB from "./utils/connectMongo.js";

dotenv.config();

const rsClient = redisClient();

export const loginClient = async () => {
    try {
        const clients = await getAllClients();
        const activeClients = clients.filter(c => c.active);

        if (!activeClients.length) {
            saveLog("LOGIN", "INFO", "No active clients found.");
            return;
        }

        await rsClient.del("clients");

        for (const client of activeClients) {
            const { userId, loginId, secretKey, appKey, brokerUrl, isDealer, active } = client;

            if (loginId === "SIM") {
                saveLog("LOGIN", "INFO", `Skipping login for ${userId} (SIM mode).`);
                continue;
            }

            const clientObj = { active, clientId: userId, orderUrl: brokerUrl, isDealer };

            try {
                await rsClient.rpush("clients", JSON.stringify(clientObj));
                console.log(`Stored client details for ${userId}`);

            } catch (err) {
                saveLog("REDIS", "ERROR", `Failed to store client details for ${userId}: ${err.message}`);
                continue;
            }

            const body = { secretKey, appKey, source: "WEBAPI" };
            const url = `${brokerUrl}/interactive/user/session`;

            try {
                const { data } = await axiosFetch(url, "POST", {
                    "Content-Type": "application/json",
                }, body);
                await rsClient.hset("auth", userId, data.token);

                saveLog("LOGIN", "INFO", `Client ${userId} logged in successfully.`);
            } catch (error) {
                saveLog("LOGIN", "ERROR", `Failed login for ${userId}: ${error.message}`);
            }
        }
    } catch (error) {
        saveLog("LOGIN", "ERROR", `Unexpected error: ${error.message}`);
    }
};

export const initLoginClient = async () => {
    try {
        await connectDB();
        console.log("Connected to MongoDB at:", mongoose.connection.host);
        await loginClient();
    } catch (error) {
        console.error("Database connection failed:", error.message);
    } finally {
        mongoose.connection.close();
    }
};


export default initLoginClient;

