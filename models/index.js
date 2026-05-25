import mongoose from "mongoose";

const indexSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        enum: ["NIFTY", "BANKNIFTY", "SENSEX", "MIDCPNIFTY", "FINNIFTY"]
    },
    active: {
        type: Boolean,
        default: true
    },
    token: {
        type: Number,
        required: true
    },
    atmKey: {
        type: String,
        required: true
    },
    strikeDiff: {
        type: Number,
        required: true
    },
    exchangeSegment: {
        type: String,
        required: true
    },
    saveHistorical: {
        type: Boolean,
        default: false
    },
    subscribeStrikeLimit: {
        type: Number,
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'Index'
});

export default mongoose.model("Index", indexSchema);