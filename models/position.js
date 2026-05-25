import mongoose from "mongoose";


const positionSchema = new mongoose.Schema({
  clientID: {
    type: String,
    require: true,
  },
  tradingSymbol: {
    type: String,
    require: true,
  },
  exchangeSegment: {
    type: String,
    require: true,
    default: "NSEFO",
  },
  exchangeInstrumentId: {
    type: String,
    require: true,
  },
  orderSide: {
    type: String,
  },

  quantity: {
    type: String,
    require: true,
  },
  netAmount: {
    type: String,
    require: true
  },
  averageTradedPrice: {
    type: String,
    require: true
  },
  tradeTime: {
    type: String
  },
  index: {
    type: String
  }
},
{
  strict: false,
  timestamps: true,
  versionKey: '__v', // Enable versioning
}
)
mongoose.pluralize(null);
const position = mongoose.model("position",positionSchema) 
export default position