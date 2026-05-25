import crypto from "crypto";
import dotenv from "dotenv";
import fs from "fs/promises";
import path from "path";
import updateEnv from "./updateEnv.js";

dotenv.config({ path: "../.env" });

const algorithm = "aes-256-cbc";
const userKeysFile = path.resolve("userKeys.json");

async function loadUserKeys() {
      try {
            const fileContent = await fs.readFile(userKeysFile, "utf8");
            return JSON.parse(fileContent);
      } catch (error) {
            if (error.code === "ENOENT") {
                  await fs.writeFile(userKeysFile, JSON.stringify({}), "utf8");
                  return {};
            }
            throw error;
      }
}

async function saveUserKeys(userKeys) {
      await fs.writeFile(
            userKeysFile,
            JSON.stringify(userKeys, null, 2),
            "utf8",
      );
}

export async function encrypt(text, userId) {
      let userKeys = await loadUserKeys();

      if (!userKeys[userId]) {
            console.log(
                  `No ENCRYPTION_KEY for userId: ${userId}. Generating a new one...`,
            );
            const newKey = crypto.randomBytes(32).toString("hex");
            userKeys[userId] = newKey;
            await saveUserKeys(userKeys);
      }

      const iv = crypto.randomBytes(16);
      const key = Buffer.from(userKeys[userId], "hex");

      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(text, "utf8", "hex");
      encrypted += cipher.final("hex");

      return `${iv.toString("hex")}:${encrypted}`;
}

export async function decrypt(text, userId) {
      const userKeys = await loadUserKeys();

      if (!userKeys[userId]) {
            throw new Error(`No ENCRYPTION_KEY found for userId: ${userId}`);
      }

      const [ivHex, encryptedData] = text.split(":");
      if (!ivHex || !encryptedData) {
            throw new Error("Invalid encrypted text format");
      }

      const iv = Buffer.from(ivHex, "hex");
      const key = Buffer.from(userKeys[userId], "hex");

      if (key.length !== 32) {
            throw new Error(
                  "Invalid key length for AES-256-CBC. Expected 32 bytes.",
            );
      }

      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      try {
            let decrypted = decipher.update(encryptedData, "hex", "utf8");
            decrypted += decipher.final("utf8");

            return decrypted;
      } catch (error) {
            console.error("Decryption failed:", error.message);
            throw error;
      }
}
