import sSchema from "../models/strategy.js";
import { saveLog } from "../../shared/utils/saveLogs.js";
import connectDB from "./connectMongo.js";
import redisConnect from "./redisConnect.js";
connectDB();
const client = redisConnect();

export default async function checkStgStatus() {
    try {
        const stgList = await sSchema.find({ type: 'TimeWise' });
        const now = new Date();
        const time = now.toTimeString().split(' ')[0];

        stgList.forEach(async (stg) => {
            const { name, status, startTime } = stg;
            if (startTime <= time && status === 'Waiting') {
                saveLog(name, 'ERROR', `TIME BREACH :- ${name} is at Status:${status}, Time:${startTime}`);
                await sSchema.updateOne({ name }, { status: 'Running', loaded: true });
                saveLog(name, 'MESSAGE', `${name} is now Running`);
                const stgQueue = 'rotateStrategy';
                client.lpush(stgQueue, JSON.stringify(stg));
            }
        });
    } catch (err) {
        console.error("Error checking strategy status:", err);
    }
}
