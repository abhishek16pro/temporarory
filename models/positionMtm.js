import mongoose from "mongoose";

const positionMtmSchema = new mongoose.Schema(
  {
    clientId: {
      userId: String,
      firstName: String,
      _id: mongoose.Schema.Types.ObjectId,
      mapped: Boolean,
      active: Boolean,
      parent: String,
      brokerUrl: String,
    },
    mtm: {
      type: Number,
      required: true,
    },
    positions: [
      {
        accountID: String,
        tradingSymbol: String,
        exchangeSegment: String,
        exchangeInstrumentId: String,
        marketlot: String,
        quantity: String,
        netAmount: String,
        buyAveragePrice: String,
        sellAveragePrice: String,
        buyAmount: String,
        sellAmount: String,
        openBuyQuantity: String,
        openSellQuantity: String,
      },
    ],
    totalBuyQuantity: Number,
    totalSellQuantity: Number,
    netQuantity: Number,
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: "__v",
  }
);

mongoose.pluralize(null);
const positionMtm = mongoose.model("positionMtm", positionMtmSchema);
export default positionMtm;
