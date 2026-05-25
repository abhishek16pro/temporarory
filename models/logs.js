import mongoose from "mongoose";

const Logs = new mongoose.Schema({
    name: {
        type: String,
        default: 'Unknown'
    },
    key: {
        type: String,
        default: 'Unknown'
    },
    type: {
        type: String,
    },
    message: {
        type: String,
    },
    time: {
        type: Date,
        default: Date.now
    }
})



mongoose.pluralize(null);
const Log = mongoose.model("logs", Logs);
export default Log;