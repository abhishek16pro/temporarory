import Redis from "ioredis";

const redis = new Redis({
  host: "94.136.188.235",
  port: 6379,
  password: "Deriv1x@786",
});


const LIST_NAME = "Logs";
const TARGET_NAME = "DATAFEED";
const TARGET_TYPE ="ERROR";
const MSG = "Error in method modifyPartialOrder: Bad Request"

async function cleanLogs() {
  try {
    const logs = await redis.lrange(LIST_NAME, 0, -1);
    console.log(`Fetched ${logs.length} entries from ${LIST_NAME}`);
    const filtered = logs.filter((entry) => {
      try {
        const obj = JSON.parse(entry);
        return !(obj.type === TARGET_TYPE);
      } catch {
        return true;
      }
    });

    console.log(`Keeping ${filtered.length} entries, removing ${logs.length - filtered.length}`);


    await redis.del(LIST_NAME);
    if (filtered.length > 0) {
      await redis.rpush(LIST_NAME, ...filtered);
    }

    console.log("✅ Logs cleaned successfully!");
  } catch (err) {
    console.error("Error cleaning logs:", err);
  } finally {
    redis.disconnect();
  }
}

cleanLogs();
