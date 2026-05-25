import mongoose from "mongoose";

// const legSchema = new mongoose.Schema({
//   leg: Number,
//   lot: Number,
//   tradeType: String, // B / S
//   optionType: String, // CE / PE
//   strikeSelectionType: String,
//   strikeSelectionValue: mongoose.Schema.Types.Decimal128,
//   trailBy: mongoose.Schema.Types.Decimal128,
//   trailAfter: mongoose.Schema.Types.Decimal128
// }, { strict: false });

const pullBackStrategySchema = new mongoose.Schema(
  {
    active: { type: Boolean, default: false },
    strategyType: { type: String, required: true },
    name: { type: String, unique: true, required: true },
    index: { type: String, required: true },
    strategyTag: { type: String, required: true },
  },
  {
    timestamps: true,
    strict: false
  }
);

export default mongoose.model("dynamicStrategy", pullBackStrategySchema);