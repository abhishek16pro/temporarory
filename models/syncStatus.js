import mongoose from "mongoose";

const data_schema = mongoose.Schema({}, { strict: false });

mongoose.pluralize(null);
const SyncManagement = mongoose.model("syncManagement", data_schema);
export default SyncManagement;