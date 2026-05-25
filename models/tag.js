import mongoose from "mongoose";

const stgTagSchema = new mongoose.Schema(
  {
    tag: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    mappedAccount: [
      {
        clientId: {
          type: String,
          required: true,
        },
        multiplier: {
          type: Number,
          default: 1,
        },
        active: {
          type: Boolean,
          default: true,
        },
        orderUrl: {
          type: String,
          default: "",
        },
        isDealer: {
          type: Boolean,
          default: false,
        },
      },
    ],
    tagParentAccount: {
      type: String,
      default: "",
    },
    tagMaxLoss: {
      type: Number,
      default: 0,
    },
    tagMaxProfit: {
      type: Number,
      default: 0,
    },
    maxLossWaitSeconds: {
      type: Number,
      default: 0,
    },
    maxProfitWaitSeconds: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const StgTag = mongoose.model("stgtag", stgTagSchema);

export default StgTag;
