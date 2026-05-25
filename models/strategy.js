
import mongoose from "mongoose";

const strategySchema = new mongoose.Schema({
    status: {
        type: String,
        require: true,
        default: "Stopped",
        enum: ["Stopped", "Running", "Waiting", "Completed"],
    },
    type: {
        type: String,
        require: true,
        default: "TimeWise",
        enum: ["TimeWise", "Dependent"],
    },
    loaded: {
        type: Boolean,
        default: false,
        require: true,
    },
    name: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function (value) {
                return /\S/.test(value);
            },
            message: 'Name cannot be blank'
        },
        trim: true,
        minlength: 1,
        max: 50
    },

    tag: {
        type: String,
        required: true
    },

    parentAcc: {
        type: String,
        required: true,
        default: "DIVK0434"
    },


    startTime: {
        type: String,
        required: true,
        // validate: {
        //     validator: function (value) {
        //         // Use a regular expression to check the format and range
        //         const timePattern = /^(09|10|11|12|13|14|15|16|112):[0-5][0-9]:[0-5][0-9]$/;
        //         return timePattern.test(value);
        //     },
        //     message: 'sqTime should be in the format HH:MM:SS and between 09:00:00 and 15:30:00'
        // }
    },
    endTime: {
        type: String,
        required: true,
        // validate: {
        //     validator: function (value) {
        //         // Use a regular expression to check the format and range
        //         const timePattern = /^(09|10|11|12|13|14|15):[0-5][0-9]:[0-5][0-9]$/;
        //         return timePattern.test(value);
        //     },
        //     message: 'sqTime should be in the format HH:MM:SS and between 09:00:00 and 15:30:00'
        // }
    },
    sqTime: {
        type: String,
        required: true,
        // validate: {
        //     validator: function (value) {
        //         // Use a regular expression to check the format and range
        //         const timePattern = /^(09|10|11|12|13|14|15):[0-5][0-9]:[0-5][0-9]$/;
        //         return timePattern.test(value);
        //     },
        //     message: 'sqTime should be in the format HH:MM:SS and between 09:00:00 and 15:30:00'
        // }
    },
    runOnDay: {
        type: [Number], // Array of numbers
        required: true,
        // validate: {
        //     validator: function (value) {
        //         // Check if all values in the array are between 1 and 5
        //         return value.every(day => day >= 1 && day <= 5);
        //     },
        //     message: 'All values in runOnDay array must be between 1 and 5'
        // }
    },
    mappedAccount: {
        type: [
            {
                active: Boolean,
                clientId: String,
                multiplier: Number,
                orderUrl: String,
                isDealer: Boolean
            }
        ],
        required: true
    },

    profitType: {
        type: String,
        enum: ["combinedProfit", "premium%", "underlying%", "premiumPoints", "vwapInPoints", "vwapInPercentage", "None"],
    },
    profit: {
        type: Number,
        require: true,
        min: 0
    },

    lossType: {
        type: String,
        enum: ["combinedSL", "premium%", "underlying%", "premiumPoints", "vwapInPoints", "vwapInPercentage", "None"],
    },
    loss: {
        type: Number,
        require: true,
        max: 0
    },
    combinedSlTrailAfter: {
        type: String,
        default: ""
    },
    combinedSlTrailBy: {
        type: String,
        default: ""
    },

    exitbuffervalue: {
        type: Number,
        require: true,
        default: 5,
        min: 0
    },
    entrybuffervalue: {
        type: Number,
        require: true,
        default: 5,
        min: 0
    },
    onProfitBooking: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Strategy"
        }],
        default: [] // The model name to which it is referring (in this case, "Strategy")
    },
    onLossBooking: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Strategy"
        }],
        default: []// The model name to which it is referring (in this case, "Strategy")
    },
    onLossBookingSqOff: {
        type: [String]
    },
    onProfitBookingSqOff: {
        type: [String]
    },
    upPortfolioOnSl: {
        type: [String]
    },
    downPortfolioOnSl: {
        type: [String]
    },
    upPortfolioOnTg: {
        type: [String]
    },
    downPortfolioOnTg: {
        type: [String]
    },
    index: {
        type: String,
        require: true,
        default: "NIFTY",
        enum: ["NIFTY", "FINNIFTY", "BANKNIFTY", "MIDCPNIFTY", "SENSEX"],
    },
    pnl: {
        type: Number,
        default: 0,
        required: true
    },
    diffPercentage: {
        type: Number,
        default: 0,
    },
    minPoints: {
        type: Number,
        default: 0,
    },
    minHoldTime: {
        type: Number,
        default: 0,
    },
    whichLegSqoff: {
        type: String,
        default: "",
        enum: ["HighPremium", "LowPremium", "None", ""]
    },
    action: {
        type: String,
        default: "",
        enum: ["onTarget", "onStopLoss", ""]

    },
    isCpRatioEnable: {
        type: Boolean,
        default: false,
    },
    minVwapCheckGap: {
        type: Number,
        default: 5,
        min: 1,
        required: true
    },
    minVwapCheckTimes: {
        type: Number,
        default: 3,
        min: 1,
        required: true
    },
    minVwapDiff: {
        type: Number,
        default: 0,
        min: 0,
        required: true
    },
    isVwapEnabled: {
        type: Boolean,
        default: false,
        required: true
    },
    combinedVwapType: {
        type: String,
        default: "onLeg",
        enum: ["onLeg", "onATM"]
    },
    // Add ORB strategy fields
    monitorTime: {
        type: String,
        // required: false,
        // validate: {
        //     validator: function(value) {
        //         if (!value) return true; // Allow null/empty if not required
        //         const timePattern = /^(09|10|11|12|13|14|15):[0-5][0-9]$/;
        //         return timePattern.test(value);
        //     },
        //     message: 'monitorTime should be in the format HH:MM and between 09:00 and 15:30'
        // }
    },
    checkIntervalMinutes: {
        type: Number,
        default: 1,
        min: 1,
    },
    isOrbEnabled: {
        type: Boolean,
        default: false
    },
    rangeBuffer: {
        type: String,
    },
    isBuy: {
        type: Boolean,
        default: false,
        required: true
    },
    isSell: {
        type: Boolean,
        default: true,
        required: true
    },
    minDiffType: {
        type: String,
        enum: ["points", "percentage"],
        default: "points"
    },
    startMonitoringPercentage: {
        type: Number,
        default: 0.5
    },
    sellVwapType: {
        type: String,
        enum: ["individual", "combined"],
        default: "combined"
    },
    isCombinedEntry: {
        type: Boolean,
        default: false
    },
    combinedEntryType: {
        type: String,
        enum: ["combinedPremium"],
        default: "combinedPremium"
    },
    combinedEntryValue: {
        type: String,
        default: "0"
    },
    combinedStrikeSelectionType: {
        type: String,
        enum: ["premiumClose", "premiumgreater", "premiumless", "ByStrike", "Atm", "Sd"],
    },
    combinedStrikeSelectionValue: {
        type: Number,
    },
    combinedDecayType: {
        type: String,
        enum: ["onLeg", "onSignal"],
        default: "onSignal"
    },
    checkCombinedStrikeDecay: {
        type: Boolean,
        default: false
    },
    watchMinutes: {
        type: Number,
        default: 0
    },
    lds: {
        type: Boolean,
        default: false
    },
    dayHighLow: {
        type: Boolean,
        default: false
    },
    ldsType: {
        type: String,
        enum: ["dayLow", "dayHigh"],
        default: "dayLow"
    },
    ldsSLType: {
        type: String,
        enum: ["oppositeSide"],
        default: "oppositeSide"
    },
    ldsSlBuffer: {
        type: Number,
        default: 0
    },
    ldsAutoExit: {
        type: Boolean,
        default: false
    },
    candleCloseLds: {
        type: Number,
        default: 0
    },
    ldsEntryBuffer: {
        type: Number,
        default: 0
    },
    ldsSmPercent: {
        type: String,
        default: 0
    },
    ldsMonitorType: {
        type: String,
        enum: ["onLeg", "onSignal"],
        default: "onLeg"
    },
    decayPercentage: {
        type: Number,
        default: 0
    },
    montoringStrikeType: {
        type: String,
        enum: ["Atm", "Sd"],
        default: "Atm"

    },
    monitoringStrikeValue: {
        type: Number,
        default: 0
    },
    isDecayDrivenStraddle: {
        type: Boolean,
        default: false
    },
    isRollingStraddleEnabled: {
        type: Boolean,
        default: false
    },
    isStraddleValueDecay: {
        type: Boolean,
        default: false
    },
    isStaticStrikeDecay: {
        type: Boolean,
        default: false
    },
    straddleStrikeBasis: {
        type: String,
        enum: ["Atm", "Sd"],
        default: "Atm"
    },
    strikeOffsetFromATM: {
        type: Number,
        default: 0
    },
    stdDecay: {
        type: String,
    },
    onCompletionExecute: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Strategy"
        }],
        default: []
    },
    onCompletionSqoff: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Strategy"
        }],
        default: []
    },
    underMonitoring: {
        type: Boolean,
        default: false
    },
    rexOnCompletion: {
        type: Number,
        default: 0
    },
    rexDelay: {
        type: Number,
        default: 0
    },
    rexCondition: {
        type: String,
        enum: ["onTarget", "onStopLoss", "both"],
        default: "both"
    },
    onCompletionExecuteDelay: {
        type: Number,
        default: 0
    },
    doubleUnderlying: {
        type: Boolean,
        default: false
    },
    rangeArray: [{
        rangeFrame: {
            type: Number,
            default: 0
        }
    }],
    isSdt: {
        type: Boolean,
        default: false
    },
    sdtInitialLegSlType: {
        type: String,
        enum: ["combinedSL", "premiumPoints", "premium%", "vwapInPoints", "vwapInPercentage"],
        default: "combinedSL"
    },
    sdtChecks: {
        type: Number,
        default: 1,
        min: 1,
        max: 2
    },
    sdtUpLegArr: {
        type: [Number],
        default: []
    },
    sdtDownLegArr: {
        type: [Number],
        default: []
    },
    sdtInitialRealTrades: {
        type: Boolean,
        default: true
    },
    leg1: {
        added: {
            type: Boolean,
            default: false,
            require: true,
        },
        status: {
            type: String,
            enum: ["pending", "running", "completed"]
        },
        idle: {
            type: Boolean,
            default: false,
        },
        lot: {
            type: Number,
            default: 1,
        },
        tradeType: {
            type: String,
            enum: ["B", "S"],

        },
        optionType: {
            type: String,
            enum: ["CE", "PE"],

        },
        strikeSelectionType: {
            type: String,
            enum: ["premiumClose", "premiumgreater", "premiumless", "ByStrike", "Atm", "Sd", "straddlePremBelow", "straddlePremAbove", "straddlePremClosest"],
        },
        strikeSelectionValue: {
            type: Number,
        },
        waitTrade: {
            type: Number
        },
        vwapWaitTrade: {
            type: String,
        },
        underlyingWaitTrade: {
            type: String,
        },
        wtCandleClose: {
            type: Number
        },
        rexCandleCloseTime: {
            type: Number,
            default: 0
        },
        targetType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        targetValue: {
            type: Number
        },
        sLType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        sLValue: {
            type: Number
        },
        trailAfter: {
            type: String
        },
        trailBy: {
            type: String
        },
        onTargetType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecuteOppositeLtp", "None"],
        },
        onStopLossExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStopLossSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTargetValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        onTargetTimes: {
            type: Number,
            min: 0,
            max: 20
        },
        onSLType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecuteOppositeLtp", "None"],
        },
        onSLValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        onSLTimes: {
            type: Number,
            min: 0,
            max: 20
        },
        legDelay: {
            type: Number,
            default: 0
        },
        onStartAction: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onStartAction array must be between -12 and 12'
            }
        },
        onStartExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStartSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
    },
    leg2: {
        added: {
            type: Boolean,
            default: false,
            require: true,
        },
        status: {
            type: String,
            enum: ["pending", "running", "completed"]
        },
        idle: {
            type: Boolean,
            default: false,
        },
        lot: {
            type: Number,
            default: 1,
        },
        tradeType: {
            type: String,
            enum: ["B", "S"],

        }
        ,
        optionType: {
            type: String,
            enum: ["CE", "PE"],

        },
        strikeSelectionType: {
            type: String,
            enum: ["premiumClose", "premiumgreater", "premiumless", "ByStrike", "Atm", "Sd", "straddlePremBelow", "straddlePremAbove", "straddlePremClosest"],
        },
        strikeSelectionValue: {
            type: Number,
        },
        waitTrade: {
            type: Number
        },
        vwapWaitTrade: {
            type: String,
        },
        underlyingWaitTrade: {
            type: String,
        },
        wtCandleClose: {
            type: Number
        },
        rexCandleCloseTime: {
            type: Number,
            default: 0
        },
        targetType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        targetValue: {
            type: Number
        },
        sLType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        sLValue: {
            type: Number
        },
        onTargetType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecuteOppositeLtp", "None"],
        },
        onStopLossExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStopLossSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTargetValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        onTargetTimes: {
            type: Number,
            min: 0,
            max: 10
        },
        onSLType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecuteOppositeLtp", "None"],
        },
        onSLValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        trailAfter: {
            type: String
        },
        trailBy: {
            type: String
        },
        onSLTimes: {
            type: Number,
            min: 0,
            max: 10
        },
        legDelay: {
            type: Number,
            default: 0
        },
        onStartAction: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onStartAction array must be between -12 and 12'
            }
        },
        onStartExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStartSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },



    },
    leg3: {
        added: {
            type: Boolean,
            default: false,
            require: true,
        },
        status: {
            type: String,
            enum: ["pending", "running", "completed"]
        },
        idle: {
            type: Boolean,
            default: false,
        },
        lot: {
            type: Number,
            default: 1,
        },
        tradeType: {
            type: String,
            enum: ["B", "S"],

        }
        ,
        optionType: {
            type: String,
            enum: ["CE", "PE"],

        },
        strikeSelectionType: {
            type: String,
            enum: ["premiumClose", "premiumgreater", "premiumless", "ByStrike", "Atm", "Sd", "straddlePremBelow", "straddlePremAbove", "straddlePremClosest"],
        },
        strikeSelectionValue: {
            type: Number,
        },
        waitTrade: {
            type: Number
        },
        vwapWaitTrade: {
            type: String,
        },
        underlyingWaitTrade: {
            type: String,
        },
        wtCandleClose: {
            type: Number
        },
        rexCandleCloseTime: {
            type: Number,
            default: 0
        },
        targetType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        targetValue: {
            type: Number
        },
        sLType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        sLValue: {
            type: Number
        },
        trailAfter: {
            type: String
        },
        trailBy: {
            type: String
        },
        onTargetType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecuteOppositeLtp", "None"],
        },
        onStopLossExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStopLossSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTargetValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        onTargetTimes: {
            type: Number,
            min: 0,
            max: 10
        },
        onSLType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecuteOppositeLtp", "None"],
        },
        onSLValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        onSLTimes: {
            type: Number,
            min: 0,
            max: 10
        },

        legDelay: {
            type: Number,
            default: 0
        },
        onStartAction: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onStartAction array must be between -12 and 12'
            }
        },
        onStartExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStartSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },


    },
    leg4: {
        added: {
            type: Boolean,
            default: false,
            require: true,
        },
        status: {
            type: String,
            enum: ["pending", "running", "completed"]
        },
        idle: {
            type: Boolean,
            default: false,
        },
        lot: {
            type: Number,
            default: 1,
        },
        tradeType: {
            type: String,
            enum: ["B", "S"],
        },
        optionType: {
            type: String,
            enum: ["CE", "PE"],

        },
        strikeSelectionType: {
            type: String,
            enum: ["premiumClose", "premiumgreater", "premiumless", "ByStrike", "Atm", "Sd", "straddlePremBelow", "straddlePremAbove", "straddlePremClosest"],
        },
        strikeSelectionValue: {
            type: Number,
        },
        waitTrade: {
            type: Number
        },
        vwapWaitTrade: {
            type: String,
        },
        underlyingWaitTrade: {
            type: String,
        },
        wtCandleClose: {
            type: Number
        },
        rexCandleCloseTime: {
            type: Number,
            default: 0
        },
        targetType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        targetValue: {
            type: Number
        },
        sLType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        sLValue: {
            type: Number
        },
        trailAfter: {
            type: String
        },
        trailBy: {
            type: String
        },
        onTargetType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecuteOppositeLtp", "None"],
        },
        onStopLossExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStopLossSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTargetValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        onTargetTimes: {
            type: Number,
            min: 0,
            max: 10
        },
        onSLType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecuteOppositeLtp", "None"],
        },
        onSLValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        onSLTimes: {
            type: Number,
            min: 0,
            max: 10
        },

        legDelay: {
            type: Number,
            default: 0
        },
        onStartAction: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onStartAction array must be between -12 and 12'
            }
        },
        onStartExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStartSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },

    },
    leg5: {
        added: {
            type: Boolean,
            default: false,
            require: true,
        },
        status: {
            type: String,
            enum: ["pending", "running", "completed"]
        },
        idle: {
            type: Boolean,
            default: false,
        },
        lot: {
            type: Number,
            default: 1,
        },
        tradeType: {
            type: String,
            enum: ["B", "S"],

        },
        optionType: {
            type: String,
            enum: ["CE", "PE"],

        },
        strikeSelectionType: {
            type: String,
            enum: ["premiumClose", "premiumgreater", "premiumless", "ByStrike", "Atm", "Sd", "straddlePremBelow", "straddlePremAbove", "straddlePremClosest"],
        },
        strikeSelectionValue: {
            type: Number,
        },
        waitTrade: {
            type: Number
        },
        vwapWaitTrade: {
            type: String,
        },
        underlyingWaitTrade: {
            type: String,
        },
        wtCandleClose: {
            type: Number
        },
        rexCandleCloseTime: {
            type: Number,
            default: 0
        },
        targetType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        targetValue: {
            type: Number
        },
        sLType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        sLValue: {
            type: Number
        },
        trailAfter: {
            type: String
        },
        trailBy: {
            type: String
        },
        onTargetType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecuteOppositeLtp", "None"],
        },
        onStopLossExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStopLossSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTargetValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        onTargetTimes: {
            type: Number,
            min: 0,
            max: 10
        },
        onSLType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecuteOppositeLtp", "None"],
        },
        onSLValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        onSLTimes: {
            type: Number,
            min: 0,
            max: 10
        },

        legDelay: {
            type: Number,
            default: 0
        },
        onStartAction: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onStartAction array must be between -12 and 12'
            }
        },
        onStartExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStartSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },


    },
    leg6: {
        added: {
            type: Boolean,
            default: false,
            require: true,
        },
        status: {
            type: String,
            enum: ["pending", "running", "completed"]
        },
        idle: {
            type: Boolean,
            default: false,
        },
        lot: {
            type: Number,
            default: 1,
        },
        tradeType: {
            type: String,
            enum: ["B", "S"],

        },
        optionType: {
            type: String,
            enum: ["CE", "PE"],

        },
        strikeSelectionType: {
            type: String,
            enum: ["premiumClose", "premiumgreater", "premiumless", "ByStrike", "Atm", "Sd", "straddlePremBelow", "straddlePremAbove", "straddlePremClosest"],
        },
        strikeSelectionValue: {
            type: Number,
        },
        waitTrade: {
            type: Number
        },
        vwapWaitTrade: {
            type: String,
        },
        underlyingWaitTrade: {
            type: String,
        },
        wtCandleClose: {
            type: Number
        },
        rexCandleCloseTime: {
            type: Number,
            default: 0
        },
        targetType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        targetValue: {
            type: Number
        },
        sLType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        sLValue: {
            type: Number
        },
        trailAfter: {
            type: String
        },
        trailBy: {
            type: String
        },
        onTargetType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecuteOppositeLtp", "None"],
        },
        onStopLossExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStopLossSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTargetValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        onTargetTimes: {
            type: Number,
            min: 0,
            max: 10
        },
        onSLType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecuteOppositeLtp", "None"],
        },
        onSLValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        onSLTimes: {
            type: Number,
            min: 0,
            max: 10
        },

        legDelay: {
            type: Number,
            default: 0
        },
        onStartAction: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onStartAction array must be between -12 and 12'
            }
        },
        onStartExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStartSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },


    },
    leg7: {
        added: {
            type: Boolean,
            default: false,
            require: true,
        },
        status: {
            type: String,
            enum: ["pending", "running", "completed"]
        },
        idle: {
            type: Boolean,
            default: false,
        },
        lot: {
            type: Number,
            default: 1,
        },
        tradeType: {
            type: String,
            enum: ["B", "S"],

        },
        optionType: {
            type: String,
            enum: ["CE", "PE"],

        },
        strikeSelectionType: {
            type: String,
            enum: ["premiumClose", "premiumgreater", "premiumless", "ByStrike", "Atm", "Sd", "straddlePremBelow", "straddlePremAbove", "straddlePremClosest"],
        },
        strikeSelectionValue: {
            type: Number,
        },
        waitTrade: {
            type: Number
        },
        vwapWaitTrade: {
            type: String,
        },
        underlyingWaitTrade: {
            type: String,
        },
        wtCandleClose: {
            type: Number
        },
        rexCandleCloseTime: {
            type: Number,
            default: 0
        },
        targetType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        targetValue: {
            type: Number
        },
        sLType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        sLValue: {
            type: Number
        },
        trailAfter: {
            type: String
        },
        trailBy: {
            type: String
        },
        onTargetType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecuteOppositeLtp", "None"],
        },
        onStopLossExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStopLossSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTargetValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        onTargetTimes: {
            type: Number,
            min: 0,
            max: 10
        },
        onSLType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecuteOppositeLtp", "None"],
        },
        onSLValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        onSLTimes: {
            type: Number,
            min: 0,
            max: 10
        },

        legDelay: {
            type: Number,
            default: 0
        },
        onStartAction: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onStartAction array must be between -12 and 12'
            }
        },
        onStartExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStartSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },



    },
    leg8: {
        added: {
            type: Boolean,
            default: false,
            require: true,
        },
        status: {
            type: String,
            enum: ["pending", "running", "completed"]
        },
        idle: {
            type: Boolean,
            default: false,
        },
        lot: {
            type: Number,
            default: 1,
        },
        tradeType: {
            type: String,
            enum: ["B", "S"],
        },
        optionType: {
            type: String,
            enum: ["CE", "PE"],

        },
        strikeSelectionType: {
            type: String,
            enum: ["premiumClose", "premiumgreater", "premiumless", "ByStrike", "Atm", "Sd", "straddlePremBelow", "straddlePremAbove", "straddlePremClosest"],
        },
        strikeSelectionValue: {
            type: Number,
        },
        waitTrade: {
            type: Number
        },
        vwapWaitTrade: {
            type: String,
        },
        underlyingWaitTrade: {
            type: String,
        },
        wtCandleClose: {
            type: Number
        },
        rexCandleCloseTime: {
            type: Number,
            default: 0
        },
        targetType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        targetValue: {
            type: Number
        },
        sLType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        sLValue: {
            type: Number
        },
        trailAfter: {
            type: String
        },
        trailBy: {
            type: String
        },
        onTargetType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecuteOppositeLtp", "None"],
        },
        onStopLossExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStopLossSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTargetValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        onTargetTimes: {
            type: Number,
            min: 0,
            max: 10
        },
        onSLType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecuteOppositeLtp", "None"],
        },
        onSLValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        onSLTimes: {
            type: Number,
            min: 0,
            max: 10
        },
        legDelay: {
            type: Number,
            default: 0
        },
        onStartAction: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onStartAction array must be between -12 and 12'
            }
        },
        onStartExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStartSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },

    },
    leg9: {
        added: {
            type: Boolean,
            default: false,
            require: true,
        },
        status: {
            type: String,
            enum: ["pending", "running", "completed"]
        },
        idle: {
            type: Boolean,
            default: false,
        },
        lot: {
            type: Number,
            default: 1,
        },
        tradeType: {
            type: String,
            enum: ["B", "S"],
        },
        optionType: {
            type: String,
            enum: ["CE", "PE"],

        },
        strikeSelectionType: {
            type: String,
            enum: ["premiumClose", "premiumgreater", "premiumless", "ByStrike", "Atm", "Sd", "straddlePremBelow", "straddlePremAbove", "straddlePremClosest"],
        },
        strikeSelectionValue: {
            type: Number,
        },
        waitTrade: {
            type: Number
        },
        vwapWaitTrade: {
            type: String,
        },
        underlyingWaitTrade: {
            type: String,
        },
        wtCandleClose: {
            type: Number
        },
        rexCandleCloseTime: {
            type: Number,
            default: 0
        },
        targetType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        targetValue: {
            type: Number
        },
        sLType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        sLValue: {
            type: Number
        },
        trailAfter: {
            type: String
        },
        trailBy: {
            type: String
        },
        onTargetType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecuteOppositeLtp", "None"],
        },
        onStopLossExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStopLossSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTargetValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        onTargetTimes: {
            type: Number,
            min: 0,
            max: 10
        },
        onSLType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecuteOppositeLtp", "None"],
        },
        onSLValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        onSLTimes: {
            type: Number,
            min: 0,
            max: 10
        },
        legDelay: {
            type: Number,
            default: 0
        },
        onStartAction: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onStartAction array must be between -12 and 12'
            }
        },
        onStartExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStartSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },

    },
    leg10: {
        added: {
            type: Boolean,
            default: false,
            require: true,
        },
        status: {
            type: String,
            enum: ["pending", "running", "completed"]
        },
        idle: {
            type: Boolean,
            default: false,
        },
        lot: {
            type: Number,
            default: 1,
        },
        tradeType: {
            type: String,
            enum: ["B", "S"],
        },
        optionType: {
            type: String,
            enum: ["CE", "PE"],

        },
        strikeSelectionType: {
            type: String,
            enum: ["premiumClose", "premiumgreater", "premiumless", "ByStrike", "Atm", "Sd", "straddlePremBelow", "straddlePremAbove", "straddlePremClosest"],
        },
        strikeSelectionValue: {
            type: Number,
        },
        waitTrade: {
            type: Number
        },
        vwapWaitTrade: {
            type: String,
        },
        underlyingWaitTrade: {
            type: String,
        },
        wtCandleClose: {
            type: Number
        },
        rexCandleCloseTime: {
            type: Number,
            default: 0
        },
        targetType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        targetValue: {
            type: Number
        },
        sLType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        sLValue: {
            type: Number
        },
        trailAfter: {
            type: String
        },
        trailBy: {
            type: String
        },
        onTargetType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecuteOppositeLtp", "None"],
        },
        onStopLossExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStopLossSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTargetValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        onTargetTimes: {
            type: Number,
            min: 0,
            max: 10
        },
        onSLType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecuteOppositeLtp", "None"],
        },
        onSLValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        onSLTimes: {
            type: Number,
            min: 0,
            max: 10
        },
        legDelay: {
            type: Number,
            default: 0
        },
        onStartAction: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onStartAction array must be between -12 and 12'
            }
        },
        onStartExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStartSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },

    },
    leg11: {
        added: {
            type: Boolean,
            default: false,
            require: true,
        },
        status: {
            type: String,
            enum: ["pending", "running", "completed"]
        },
        idle: {
            type: Boolean,
            default: false,
        },
        lot: {
            type: Number,
            default: 1,
        },
        tradeType: {
            type: String,
            enum: ["B", "S"],
        },
        optionType: {
            type: String,
            enum: ["CE", "PE"],

        },
        strikeSelectionType: {
            type: String,
            enum: ["premiumClose", "premiumgreater", "premiumless", "ByStrike", "Atm", "Sd", "straddlePremBelow", "straddlePremAbove", "straddlePremClosest"],
        },
        strikeSelectionValue: {
            type: Number,
        },
        waitTrade: {
            type: Number
        },
        vwapWaitTrade: {
            type: String,
        },
        underlyingWaitTrade: {
            type: String,
        },
        wtCandleClose: {
            type: Number
        },
        rexCandleCloseTime: {
            type: Number,
            default: 0
        },
        targetType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        targetValue: {
            type: Number
        },
        sLType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        sLValue: {
            type: Number
        },
        trailAfter: {
            type: String
        },
        trailBy: {
            type: String
        },
        onTargetType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecuteOppositeLtp", "None"],
        },
        onStopLossExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStopLossSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTargetValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        onTargetTimes: {
            type: Number,
            min: 0,
            max: 10
        },
        onSLType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecuteOppositeLtp", "None"],
        },
        onSLValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        onSLTimes: {
            type: Number,
            min: 0,
            max: 10
        },
        legDelay: {
            type: Number,
            default: 0
        },
        onStartAction: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onStartAction array must be between -12 and 12'
            }
        },
        onStartExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStartSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },

    },
    leg12: {
        added: {
            type: Boolean,
            default: false,
            require: true,
        },
        status: {
            type: String,
            enum: ["pending", "running", "completed"]
        },
        idle: {
            type: Boolean,
            default: false,
        },
        lot: {
            type: Number,
            default: 1,
        },
        tradeType: {
            type: String,
            enum: ["B", "S"],
        },
        optionType: {
            type: String,
            enum: ["CE", "PE"],

        },
        strikeSelectionType: {
            type: String,
            enum: ["premiumClose", "premiumgreater", "premiumless", "ByStrike", "Atm", "Sd", "straddlePremBelow", "straddlePremAbove", "straddlePremClosest"],
        },
        strikeSelectionValue: {
            type: Number,
        },
        waitTrade: {
            type: Number
        },
        vwapWaitTrade: {
            type: String,
        },
        underlyingWaitTrade: {
            type: String,
        },
        wtCandleClose: {
            type: Number
        },
        rexCandleCloseTime: {
            type: Number,
            default: 0
        },
        targetType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        targetValue: {
            type: Number
        },
        sLType: {
            type: String,
            enum: ["premiumpoints", "premium%", "underlyingpoints", "underlying%", "clm", "clt", "vwapPoints", "vwapPercentage", "ByStrike", "None"],
        },
        sLValue: {
            type: Number
        },
        trailAfter: {
            type: String
        },
        trailBy: {
            type: String
        },
        onTargetType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecutOppositeLtp", "None"],
        },
        onStopLossExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStopLossSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTakeProfitSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onTargetValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        onTargetTimes: {
            type: Number,
            min: 0,
            max: 10
        },
        onSLType: {
            type: String,
            enum: ["sqOff", "Execute", "reExecute", "reEntry", "reExecutOppositeLtp", "None"],
        },
        onSLValue: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    // Check if all values in the array are between 1 and 5
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onTarget or onSL array must be between -12 and 12'
            }
        },
        onSLTimes: {
            type: Number,
            min: 0,
            max: 10
        },
        legDelay: {
            type: Number,
            default: 0
        },
        onStartAction: {
            type: [Number], // Array of numbers
            validate: {
                validator: function (value) {
                    return value.every(day => day >= -12 && day <= 12);
                },
                message: 'All values in onStartAction array must be between -12 and 12'
            }
        },
        onStartExecute: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },
        onStartSqoff: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: "Strategy"
            }],
            default: []
        },

    },
    log: {
        leg1: {
            added: {
                type: Boolean,
                default: false,
                require: true,
            },
            status: {
                type: String,
                require: true,
                default: "Initial",
                enum: ["Initial", "Pending", "Started", "Completed"],
            },
            idle: {
                type: Boolean,
                default: false,
                require: true,
            },
            strikeSelected: {
                type: String,
                default: "",
                require: true,
            },
            strikeValue: {
                type: Number,
                default: 0,
                require: true,
            },
            underlyingValue: {
                type: Number,
                default: 0,
                required: true
            },
            stopLoss: {
                type: Number,
                default: 0,
                required: true
            },
            target: {
                type: Number,
                default: 0,
                required: true
            },
            legPnl: {
                type: Number,
                default: 0,
                required: true
            },
            premiumPnl: {
                type: Number,
                default: 0,
                required: true
            },
            trailAfter: {
                type: String
            },
            trailBy: {
                type: String
            },
            lastCCEpochTime: {
                type: Number
            },
            orderId: {
                type: String,
                default: '',
            },
            SlOrderId: {
                type: Object,
                default: () => ({ orderId: "", brokerUrl: "", clientId: "", isDealer: false }),
            },
            slOrderList: {
                type: [
                    {
                        orderId: Number,
                        brokerUrl: String,
                        clientId: String,
                        isDealer: Boolean
                    },
                ],
                default: [],
            },
            targetOrderId: {
                type: String,
                default: '',
            },
            targetOrderList: {
                type: [Number],
                default: [],
            },
            reExecuteTime: {
                type: String,
                default: null
            },
            legDelayEpochTime: {
                type: Number,
                default: 0
            },
        },
        leg2: {
            added: {
                type: Boolean,
                default: false,
                require: true,
            },
            status: {
                type: String,
                require: true,
                default: "Initial",
                enum: ["Initial", "Pending", "Started", "Completed"],
            },
            idle: {
                type: Boolean,
                default: false,
                require: true,
            },
            strikeSelected: {
                type: String,
                default: "",
                require: true,
            },
            strikeValue: {
                type: Number,
                default: 0,
                require: true,
            },
            underlyingValue: {
                type: Number,
                default: 0,
                required: true
            },
            stopLoss: {
                type: Number,
                default: 0,
                required: true
            },
            target: {
                type: Number,
                default: 0,
                required: true
            },
            legPnl: {
                type: Number,
                default: 0,
                required: true
            },
            premiumPnl: {
                type: Number,
                default: 0,
                required: true
            },
            trailAfter: {
                type: String
            },
            trailBy: {
                type: String
            },
            lastCCEpochTime: {
                type: Number
            },
            orderId: {
                type: String,
                default: '',
            },
            SlOrderId: {
                type: Object,
                default: () => ({ orderId: "", brokerUrl: "", clientId: "", isDealer: false }),
            },
            slOrderList: {
                type: [
                    {
                        orderId: Number,
                        brokerUrl: String,
                        clientId: String,
                        isDealer: Boolean
                    },
                ],
                default: [],
            },
            targetOrderId: {
                type: String,
                default: '',
            },
            targetOrderList: {
                type: [Number],
                default: [],
            },
            reExecuteTime: {
                type: String,
                default: null
            },
            legDelayEpochTime: {
                type: Number,
                default: 0
            },
        },
        leg3: {
            added: {
                type: Boolean,
                default: false,
                require: true,
            },
            status: {
                type: String,
                require: true,
                default: "Initial",
                enum: ["Initial", "Pending", "Started", "Completed"],
            },
            idle: {
                type: Boolean,
                default: false,
                require: true,
            },
            strikeSelected: {
                type: String,
                default: "",
                require: true,
            },
            strikeValue: {
                type: Number,
                default: 0,
                require: true,
            },
            underlyingValue: {
                type: Number,
                default: 0,
                required: true
            },
            stopLoss: {
                type: Number,
                default: 0,
                required: true
            },
            target: {
                type: Number,
                default: 0,
                required: true
            },
            legPnl: {
                type: Number,
                default: 0,
                required: true
            },
            premiumPnl: {
                type: Number,
                default: 0,
                required: true
            },
            trailAfter: {
                type: String
            },
            trailBy: {
                type: String
            },
            lastCCEpochTime: {
                type: Number
            },
            orderId: {
                type: String,
                default: '',
            },
            SlOrderId: {
                type: Object,
                default: () => ({ orderId: "", brokerUrl: "", clientId: "", isDealer: false }),
            },
            slOrderList: {
                type: [
                    {
                        orderId: Number,
                        brokerUrl: String,
                        clientId: String,
                        isDealer: Boolean
                    },
                ],
                default: [],
            },
            targetOrderId: {
                type: String,
                default: '',
            },
            targetOrderList: {
                type: [Number],
                default: [],
            },
            reExecuteTime: {
                type: String,
                default: null
            },
            legDelayEpochTime: {
                type: Number,
                default: 0
            },
        },
        leg4: {
            added: {
                type: Boolean,
                default: false,
                require: true,
            },
            status: {
                type: String,
                require: true,
                default: "Initial",
                enum: ["Initial", "Pending", "Started", "Completed"],
            },
            idle: {
                type: Boolean,
                default: false,
                require: true,
            },
            strikeSelected: {
                type: String,
                default: "",
                require: true,
            },
            strikeValue: {
                type: Number,
                default: 0,
                require: true,
            },
            underlyingValue: {
                type: Number,
                default: 0,
                required: true
            },
            stopLoss: {
                type: Number,
                default: 0,
                required: true
            },
            target: {
                type: Number,
                default: 0,
                required: true
            },
            legPnl: {
                type: Number,
                default: 0,
                required: true
            },
            premiumPnl: {
                type: Number,
                default: 0,
                required: true
            },
            trailAfter: {
                type: String
            },
            trailBy: {
                type: String
            },
            lastCCEpochTime: {
                type: Number
            },
            orderId: {
                type: String,
                default: '',
            },
            SlOrderId: {
                type: Object,
                default: () => ({ orderId: "", brokerUrl: "", clientId: "", isDealer: false }),
            },
            slOrderList: {
                type: [
                    {
                        orderId: Number,
                        brokerUrl: String,
                        clientId: String,
                        isDealer: Boolean
                    },
                ],
                default: [],
            },
            targetOrderId: {
                type: String,
                default: '',
            },
            targetOrderList: {
                type: [Number],
                default: [],
            },
            reExecuteTime: {
                type: String,
                default: null
            },
            legDelayEpochTime: {
                type: Number,
                default: 0
            },
        },
        leg5: {
            added: {
                type: Boolean,
                default: false,
                require: true,
            },
            status: {
                type: String,
                require: true,
                default: "Initial",
                enum: ["Initial", "Pending", "Started", "Completed"],
            },
            idle: {
                type: Boolean,
                default: false,
                require: true,
            },
            strikeSelected: {
                type: String,
                default: "",
                require: true,
            },
            strikeValue: {
                type: Number,
                default: 0,
                require: true,
            },
            underlyingValue: {
                type: Number,
                default: 0,
                required: true
            },
            stopLoss: {
                type: Number,
                default: 0,
                required: true
            },
            target: {
                type: Number,
                default: 0,
                required: true
            },
            legPnl: {
                type: Number,
                default: 0,
                required: true
            },
            premiumPnl: {
                type: Number,
                default: 0,
                required: true
            },
            trailAfter: {
                type: String
            },
            trailBy: {
                type: String
            },
            lastCCEpochTime: {
                type: Number
            },
            orderId: {
                type: String,
                default: '',
            },
            SlOrderId: {
                type: Object,
                default: () => ({ orderId: "", brokerUrl: "", clientId: "", isDealer: false }),
            },
            slOrderList: {
                type: [
                    {
                        orderId: Number,
                        brokerUrl: String,
                        clientId: String,
                        isDealer: Boolean
                    },
                ],
                default: [],
            },
            targetOrderId: {
                type: String,
                default: '',
            },
            targetOrderList: {
                type: [Number],
                default: [],
            },
            reExecuteTime: {
                type: String,
                default: null
            },
            legDelayEpochTime: {
                type: Number,
                default: 0
            },
        },
        leg6: {
            added: {
                type: Boolean,
                default: false,
                require: true,
            },
            status: {
                type: String,
                require: true,
                default: "Initial",
                enum: ["Initial", "Pending", "Started", "Completed"],
            },
            idle: {
                type: Boolean,
                default: false,
                require: true,
            },
            strikeSelected: {
                type: String,
                default: "",
                require: true,
            },
            strikeValue: {
                type: Number,
                default: 0,
                require: true,
            },
            underlyingValue: {
                type: Number,
                default: 0,
                required: true
            },
            stopLoss: {
                type: Number,
                default: 0,
                required: true
            },
            target: {
                type: Number,
                default: 0,
                required: true
            },
            legPnl: {
                type: Number,
                default: 0,
                required: true
            },
            premiumPnl: {
                type: Number,
                default: 0,
                required: true
            },
            trailAfter: {
                type: String
            },
            trailBy: {
                type: String
            },
            lastCCEpochTime: {
                type: Number
            },
            orderId: {
                type: String,
                default: '',
            },
            SlOrderId: {
                type: Object,
                default: () => ({ orderId: "", brokerUrl: "", clientId: "", isDealer: false }),
            },
            slOrderList: {
                type: [
                    {
                        orderId: Number,
                        brokerUrl: String,
                        clientId: String,
                        isDealer: Boolean
                    },
                ],
                default: [],
            },
            targetOrderId: {
                type: String,
                default: '',
            },
            targetOrderList: {
                type: [Number],
                default: [],
            },
            reExecuteTime: {
                type: String,
                default: null
            },
            legDelayEpochTime: {
                type: Number,
                default: 0
            },
        },
        leg7: {
            added: {
                type: Boolean,
                default: false,
                require: true,
            },
            status: {
                type: String,
                require: true,
                default: "Initial",
                enum: ["Initial", "Pending", "Started", "Completed"],
            },
            idle: {
                type: Boolean,
                default: false,
                require: true,
            },
            strikeSelected: {
                type: String,
                default: "",
                require: true,
            },
            strikeValue: {
                type: Number,
                default: 0,
                require: true,
            },
            underlyingValue: {
                type: Number,
                default: 0,
                required: true
            },
            stopLoss: {
                type: Number,
                default: 0,
                required: true
            },
            target: {
                type: Number,
                default: 0,
                required: true
            },
            legPnl: {
                type: Number,
                default: 0,
                required: true
            },
            premiumPnl: {
                type: Number,
                default: 0,
                required: true
            },
            trailAfter: {
                type: String
            },
            trailBy: {
                type: String
            },
            lastCCEpochTime: {
                type: Number
            },
            orderId: {
                type: String,
                default: '',
            },
            SlOrderId: {
                type: Object,
                default: () => ({ orderId: "", brokerUrl: "", clientId: "", isDealer: false }),
            },
            slOrderList: {
                type: [
                    {
                        orderId: Number,
                        brokerUrl: String,
                        clientId: String,
                        isDealer: Boolean
                    },
                ],
                default: [],
            },
            targetOrderId: {
                type: String,
                default: '',
            },
            targetOrderList: {
                type: [Number],
                default: [],
            },
            reExecuteTime: {
                type: String,
                default: null
            },
            legDelayEpochTime: {
                type: Number,
                default: 0
            },
        },
        leg8: {
            added: {
                type: Boolean,
                default: false,
                require: true,
            },
            status: {
                type: String,
                require: true,
                default: "Initial",
                enum: ["Initial", "Pending", "Started", "Completed"],
            },
            idle: {
                type: Boolean,
                default: false,
                require: true,
            },
            strikeSelected: {
                type: String,
                default: "",
                require: true,
            },
            strikeValue: {
                type: Number,
                default: 0,
                require: true,
            },
            underlyingValue: {
                type: Number,
                default: 0,
                required: true
            },
            stopLoss: {
                type: Number,
                default: 0,
                required: true
            },
            target: {
                type: Number,
                default: 0,
                required: true
            },
            legPnl: {
                type: Number,
                default: 0,
                required: true
            },
            premiumPnl: {
                type: Number,
                default: 0,
                required: true
            },
            trailAfter: {
                type: String
            },
            trailBy: {
                type: String
            },
            lastCCEpochTime: {
                type: Number
            },
            orderId: {
                type: String,
                default: '',
            },
            SlOrderId: {
                type: Object,
                default: () => ({ orderId: "", brokerUrl: "", clientId: "", isDealer: false }),
            },
            slOrderList: {
                type: [
                    {
                        orderId: Number,
                        brokerUrl: String,
                        clientId: String,
                        isDealer: Boolean
                    },
                ],
                default: [],
            },
            targetOrderId: {
                type: String,
                default: '',
            },
            targetOrderList: {
                type: [Number],
                default: [],
            },
            reExecuteTime: {
                type: String,
                default: null
            },
            legDelayEpochTime: {
                type: Number,
                default: 0
            },
        },
        leg9: {
            added: {
                type: Boolean,
                default: false,
                require: true,
            },
            status: {
                type: String,
                require: true,
                default: "Initial",
                enum: ["Initial", "Pending", "Started", "Completed"],
            },
            idle: {
                type: Boolean,
                default: false,
                require: true,
            },
            strikeSelected: {
                type: String,
                default: "",
                require: true,
            },
            strikeValue: {
                type: Number,
                default: 0,
                require: true,
            },
            underlyingValue: {
                type: Number,
                default: 0,
                required: true
            },
            stopLoss: {
                type: Number,
                default: 0,
                required: true
            },
            target: {
                type: Number,
                default: 0,
                required: true
            },
            legPnl: {
                type: Number,
                default: 0,
                required: true
            },
            premiumPnl: {
                type: Number,
                default: 0,
                required: true
            },
            trailAfter: {
                type: String
            },
            trailBy: {
                type: String
            },
            lastCCEpochTime: {
                type: Number
            },
            orderId: {
                type: String,
                default: '',
            },
            SlOrderId: {
                type: Object,
                default: () => ({ orderId: "", brokerUrl: "", clientId: "", isDealer: false }),
            },
            slOrderList: {
                type: [
                    {
                        orderId: Number,
                        brokerUrl: String,
                        clientId: String,
                        isDealer: Boolean
                    },
                ],
                default: [],
            },
            targetOrderId: {
                type: String,
                default: '',
            },
            targetOrderList: {
                type: [Number],
                default: [],
            },
            reExecuteTime: {
                type: String,
                default: null
            },
            legDelayEpochTime: {
                type: Number,
                default: 0
            },
        },
        leg10: {
            added: {
                type: Boolean,
                default: false,
                require: true,
            },
            status: {
                type: String,
                require: true,
                default: "Initial",
                enum: ["Initial", "Pending", "Started", "Completed"],
            },
            idle: {
                type: Boolean,
                default: false,
                require: true,
            },
            strikeSelected: {
                type: String,
                default: "",
                require: true,
            },
            strikeValue: {
                type: Number,
                default: 0,
                require: true,
            },
            underlyingValue: {
                type: Number,
                default: 0,
                required: true
            },
            stopLoss: {
                type: Number,
                default: 0,
                required: true
            },
            target: {
                type: Number,
                default: 0,
                required: true
            },
            legPnl: {
                type: Number,
                default: 0,
                required: true
            },
            premiumPnl: {
                type: Number,
                default: 0,
                required: true
            },
            trailAfter: {
                type: String
            },
            trailBy: {
                type: String
            },
            lastCCEpochTime: {
                type: Number
            },
            orderId: {
                type: String,
                default: '',
            },
            SlOrderId: {
                type: Object,
                default: () => ({ orderId: "", brokerUrl: "", clientId: "", isDealer: false }),
            },
            slOrderList: {
                type: [
                    {
                        orderId: Number,
                        brokerUrl: String,
                        clientId: String,
                        isDealer: Boolean
                    },
                ],
                default: [],
            },
            targetOrderId: {
                type: String,
                default: '',
            },
            targetOrderList: {
                type: [Number],
                default: [],
            },
            reExecuteTime: {
                type: String,
                default: null
            },
            legDelayEpochTime: {
                type: Number,
                default: 0
            },
        },
        leg11: {
            added: {
                type: Boolean,
                default: false,
                require: true,
            },
            status: {
                type: String,
                require: true,
                default: "Initial",
                enum: ["Initial", "Pending", "Started", "Completed"],
            },
            idle: {
                type: Boolean,
                default: false,
                require: true,
            },
            strikeSelected: {
                type: String,
                default: "",
                require: true,
            },
            strikeValue: {
                type: Number,
                default: 0,
                require: true,
            },
            underlyingValue: {
                type: Number,
                default: 0,
                required: true
            },
            stopLoss: {
                type: Number,
                default: 0,
                required: true
            },
            target: {
                type: Number,
                default: 0,
                required: true
            },
            legPnl: {
                type: Number,
                default: 0,
                required: true
            },
            premiumPnl: {
                type: Number,
                default: 0,
                required: true
            },
            trailAfter: {
                type: String
            },
            trailBy: {
                type: String
            },
            lastCCEpochTime: {
                type: Number
            },
            orderId: {
                type: String,
                default: '',
            },
            SlOrderId: {
                type: Object,
                default: () => ({ orderId: "", brokerUrl: "", clientId: "", isDealer: false }),
            },
            slOrderList: {
                type: [
                    {
                        orderId: Number,
                        brokerUrl: String,
                        clientId: String,
                        isDealer: Boolean
                    },
                ],
                default: [],
            },
            targetOrderId: {
                type: String,
                default: '',
            },
            targetOrderList: {
                type: [Number],
                default: [],
            },
            reExecuteTime: {
                type: String,
                default: null
            },
            legDelayEpochTime: {
                type: Number,
                default: 0
            },
        },
        leg12: {
            added: {
                type: Boolean,
                default: false,
                require: true,
            },
            status: {
                type: String,
                require: true,
                default: "Initial",
                enum: ["Initial", "Pending", "Started", "Completed"],
            },
            idle: {
                type: Boolean,
                default: false,
                require: true,
            },
            strikeSelected: {
                type: String,
                default: "",
                require: true,
            },
            strikeValue: {
                type: Number,
                default: 0,
                require: true,
            },
            underlyingValue: {
                type: Number,
                default: 0,
                required: true
            },
            stopLoss: {
                type: Number,
                default: 0,
                required: true
            },
            target: {
                type: Number,
                default: 0,
                required: true
            },
            legPnl: {
                type: Number,
                default: 0,
                required: true
            },
            premiumPnl: {
                type: Number,
                default: 0,
                required: true
            },
            trailAfter: {
                type: String
            },
            trailBy: {
                type: String
            },
            lastCCEpochTime: {
                type: Number
            },
            orderId: {
                type: String,
                default: '',
            },
            SlOrderId: {
                type: Object,
                default: () => ({ orderId: "", brokerUrl: "", clientId: "", isDealer: false }),
            },
            slOrderList: {
                type: [
                    {
                        orderId: Number,
                        brokerUrl: String,
                        clientId: String,
                        isDealer: Boolean
                    },
                ],
                default: [],
            },
            targetOrderId: {
                type: String,
                default: '',
            },
            targetOrderList: {
                type: [Number],
                default: [],
            },
            reExecuteTime: {
                type: String,
                default: null
            },
            legDelayEpochTime: {
                type: Number,
                default: 0
            },
        }
    },

},
    {
        timestamps: true,
        versionKey: '__v', // Enable versioning
    })
mongoose.pluralize(null);
const sSchema = mongoose.model("Strategy", strategySchema);
export default sSchema;