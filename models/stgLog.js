import mongoose from "mongoose";

const Logs = new mongoose.Schema({
    name: String,
    clientId: String,
    leg: String,
    symbol: String,
    symbolToken: String,
    entryLtp: Number,
    side: String,
    lot: Number,
    exitLtp: Number,
    orderStatus: String,
    entryTime: String,
    exitTime: String
})

mongoose.pluralize(null);
const Log = mongoose.model("stgLogs", Logs);
export default Log;