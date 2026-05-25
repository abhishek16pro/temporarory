import mongoose from "mongoose";

const SimOrderDetailsSchema = new mongoose.Schema({
  stgName: String,
  stgTag: String,
  mappedClients: Array,
  trade: mongoose.Schema.Types.Mixed,
  key: String,
  type: String,
  quantity: Number,
  latestChild: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

mongoose.pluralize(null);
const SimOrderDetails = mongoose.model("simOrderDetails", SimOrderDetailsSchema);
export default SimOrderDetails;


