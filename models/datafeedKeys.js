import mongoose from "mongoose";

const datafeedKeysSchema = new mongoose.Schema({
    clientid: { type: String, required: true },
    appKey: { type: String, required: true },
    secretKey: { type: String, required: true },
    source: { type: String, required: true },
    url: { type: String, required: true },
    subscriptionLimit: { type: Number, required: true }, // max instruments per API
    priority: { type: Number, default: 1 },              // lower = used first
    active: { type: Boolean, default: true },
});

mongoose.pluralize(null);
const datafeedKeys = mongoose.model("datafeedKeys", datafeedKeysSchema);
export default datafeedKeys;