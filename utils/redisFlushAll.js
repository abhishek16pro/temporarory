import redisConnect from "./redisConnect.js";

export default async function redisFlushAll() {
    const client = redisConnect();
    client.flushall((err, succeeded) => {
        console.log(succeeded, `Redis flushed at ${new Date().toLocaleString()}`); 
    });

    return;
};