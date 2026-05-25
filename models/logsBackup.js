import mongoose from "mongoose";

const LogsBackup = new mongoose.Schema({
    type: {
        type: String,
    },
    message: {
        type: String,
    },
    time: {
        type: String,
    }
})



mongoose.pluralize(null);
const BackupLogs = mongoose.model("logsBackup", LogsBackup);
export default BackupLogs;