import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

let redisInstance = null;

function redisConnect() {
  if (redisInstance) {
    return redisInstance;
  }

  const isDev = process.argv.includes("--dev");

  const redisHost = process.env.REDIS_HOST;
  const redisPort = process.env.REDIS_PORT;
  const redisPass = process.env.REDIS_PASS;

  const host = redisHost || "127.0.0.1";
  const port = redisPort || 6379;
  const password = redisPass || "";

  redisInstance = new Redis({
    host,
    port,
    password,
  });

  redisInstance.on("connect", () => {
    console.log(
      `Connected to Redis at ${isDev ? "localhost" : "Server"} (${host}:${port})`
    );
  });

  redisInstance.on("error", (err) => {
    console.error("Redis connection error:", err);
  });

  redisInstance.on("close", () => {
    console.warn("Redis connection closed.");
  });

  redisInstance.on("reconnecting", (time) => {
    console.log(`Reconnecting to Redis... Next attempt in ${time}ms`);
  });

  redisInstance.on("end", () => {
    console.warn("Redis connection ended.");
  });

  return redisInstance;
}

function getConnectionDetails() {
  dotenv.config();

  const isDev = process.argv.includes("--dev");

  const redisHost = isDev ? process.env.REDIS_HOST_DEV : process.env.REDIS_HOST;
  const redisPort = isDev ? process.env.REDIS_PORT_DEV : process.env.REDIS_PORT;
  const redisPass = isDev ? "" : process.env.REDIS_PASS;

  return {
    host: redisHost || "localhost",
    port: redisPort || 6379,
    password: redisPass || "",
  };
}

export default redisConnect;
export { getConnectionDetails };
