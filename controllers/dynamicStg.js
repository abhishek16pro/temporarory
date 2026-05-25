import ApiResponse from "../../shared/utils/apiResponse.js";
import PullBackStrategy from "../models/dynamicStrategy.js";
import redisClient from "../utils/redisConnect.js";

let client = await redisClient(); // Ensure Redis is connected before handling requests
// create pull back controller
export const pullbackCreate = async (req, res) => {
    try {
        const {
            strategyType,
            name,
            index,
            strategyTag,
            ema1,
            ema2,
            t1,
            t2,
            candleLookback,
            candleJustify,
            emaCrossOver,
            emaGapThreshold,
            rexOnTargetValue,
            rexONSl,
            slCandles,
            targetMultiplier,
            execute,
            squareOff,
            startTime,
            endTime,
            upLegs,
            downLegs
        } = req.body;


        console.log("Body: ", req.body);

        // 1. Required field validation
        const requiredFields = ["name", "index", "ema1", "ema2", "t1", "t2", "strategyType", "strategyTag"];

        const missingFields = requiredFields.filter(field => {
            return req.body[field] === undefined || req.body[field] === null || req.body[field] === "";
        });

        if (missingFields.length > 0) {
            return res.status(400).json(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: `Missing fields: ${missingFields.join(", ")}`
                }).toObject()
            );
        }

        // 2. Validate UP legs
        if (!Array.isArray(upLegs) || upLegs.length === 0) {
            return res.status(400).json(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Up legs are required"
                }).toObject()
            );
        }

        // 3. Validate DOWN legs
        if (!Array.isArray(downLegs) || downLegs.length === 0) {
            return res.status(400).json(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Down legs are required"
                }).toObject()
            );
        }

        // 4. Sanitization function
        const sanitizeLegs = (legsArr) =>
            legsArr.map((leg, index) => ({
                leg: index + 1,
                lot: Number(leg.lot) || 0,
                optionType: leg.optionType,
                strikeSelectionType: leg.strikeSelectionType,
                strikeSelectionValue: Number(leg.strikeSelectionValue) || 0,
                tradeType: leg.tradeType || "B",
            }));

        const sanitizedUpLegs = sanitizeLegs(upLegs);
        const sanitizedDownLegs = sanitizeLegs(downLegs);

        // 4. Create structured object
        const strategyData = {
            strategyType,
            name,
            index,
            strategyTag,
            ema1: Number(ema1),
            ema2: Number(ema2),
            t1,
            t2,
            emaGapThreshold: `${emaGapThreshold}%`,
            candleLookback: Number(candleLookback) + 1,
            candleJustify: Number(candleJustify),
            emaCrossOver,
            rexOnTargetValue: Number(rexOnTargetValue),
            rexONSl: Number(rexONSl),
            slCandles,
            targetMultiplier,
            execute,
            squareOff,
            startTime,
            endTime,
            upLegs: sanitizedUpLegs,
            downLegs: sanitizedDownLegs
        };

        // 5. Save to DB
        const newStrategy = new PullBackStrategy(strategyData);
        const savedStrategy = await newStrategy.save();
        console.log("savedStrategy: ", savedStrategy);

        // 6. Success response
        return res.status(201).json(
            new ApiResponse({
                success: true,
                statusCode: 201,
                message: "Strategy saved successfully",
                data: savedStrategy
            }).toObject()
        );

    } catch (error) {
        console.error("Create Strategy Error:", error);

        return res.status(500).json(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: "Internal Server Error"
            }).toObject()
        );
    }
};

// get pull back controller
export const pullBackGetData = async (req, res) => {
    try {
        // Fetch all strategies from DB
        const strategies = await PullBackStrategy.find().sort({ createdAt: -1 });

        // Check if empty
        if (!strategies || strategies.length === 0) {
            return res.status(200).json(
                new ApiResponse({
                    success: true,
                    statusCode: 200,
                    message: "No strategies found",
                    data: []
                }).toObject()
            );
        }

        // Send response
        return res.status(200).json(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "Strategies fetched successfully",
                data: strategies
            }).toObject()
        );

    } catch (error) {
        console.error("Get Strategy Error175:", error);

        return res.status(500).json(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: "Internal Server Error"
            }).toObject()
        );
    }
};

// delete pull back controller
export const pullBackDelete = async (req, res) => {
    try {
        const { id } = req.params;
        console.log("deleteId191: ", req.params);

        if (!id) {
            return res.status(400).json(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "ID is required",
                })
            );
        }

        const deletedStrategy = await PullBackStrategy.findByIdAndDelete(id);

        if (!deletedStrategy) {
            return res.status(404).json(
                new ApiResponse({
                    success: false,
                    statusCode: 404,
                    message: "Strategy not found"
                })
            );
        }


        return res.status(200).json(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "Strategy deleted successfully",
                data: deletedStrategy,
            }).toObject()
        );

    } catch (error) {
        console.error("Get Strategy Error for Delete215:", error);
        return res.status(500).json(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: "Internal Server Error"
            }).toObject()
        );
    }
};

// update pull back controller
export const pullBackUpdate = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: "ID is required",
            });
        }

        const {
            strategyType,
            name,
            index,
            strategyTag,
            ema1,
            ema2,
            t1,
            t2,
            candleLookback,
            candleJustify,
            emaCrossOver,
            emaGapThreshold,
            rexOnTargetValue,
            rexONSl,
            slCandles,
            targetMultiplier,
            execute,
            squareOff,
            startTime,
            endTime,
            upLegs,
            downLegs
        } = req.body;

        console.log("body:", req.body);

        // Validate UP legs
        if (!Array.isArray(upLegs) || upLegs.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Up legs are required"
            });
        }

        //  Validate DOWN legs
        if (!Array.isArray(downLegs) || downLegs.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Down legs are required"
            });
        }

        //  Sanitize function
        const sanitizeLegs = (legsArr) =>
            legsArr.map((leg, index) => ({
                leg: index + 1,
                lot: Number(leg.lot) || 0,
                optionType: leg.optionType,
                strikeSelectionType: leg.strikeSelectionType,
                strikeSelectionValue: Number(leg.strikeSelectionValue) || 0,
                tradeType: leg.tradeType || "B",
            }));

        const sanitizedUpLegs = sanitizeLegs(upLegs);
        const sanitizedDownLegs = sanitizeLegs(downLegs);

        // Final update object
        const updatedData = {
            strategyType,
            name,
            index,
            strategyTag,
            ema1: Number(ema1),
            ema2: Number(ema2),
            t1,
            t2,
            emaGapThreshold: `${emaGapThreshold}%`,
            candleLookback: Number(candleLookback) + 1,
            candleJustify: Number(candleJustify),
            emaCrossOver,
            rexOnTargetValue: Number(rexOnTargetValue) || 0,
            rexONSl: Number(rexONSl) || 0,
            slCandles,
            targetMultiplier,
            execute,
            squareOff,
            startTime,
            endTime,

            // ✅ NEW STRUCTURE
            upLegs: sanitizedUpLegs,
            downLegs: sanitizedDownLegs
        };

        const updatedStrategy = await PullBackStrategy.findByIdAndUpdate(
            id,
            updatedData,
            { new: true, runValidators: true }
        );

        if (!updatedStrategy) {
            return res.status(404).json({
                success: false,
                message: "Strategy not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Strategy updated successfully",
            data: updatedStrategy
        });

    } catch (error) {
        console.error("Update Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};


// toggle value controller
export const pullBackToggle = async (req, res) => {
    try {
        const { id } = req.params;
        console.log("id", id);

        const strategy = await PullBackStrategy.findById(id);
        if (!strategy) {
            return res.status(404).json({
                success: false,
                message: "Strategy not found"
            });
        }

        // If already active, check DMC list and respond
        if (strategy.active) {
            let existingList = await client.lrange("DMC", 0, -1);
            existingList = existingList.map(item => JSON.parse(item));
            const isPresent = existingList.some(item => item._id === strategy._id.toString());

            if (!isPresent) {
                await client.lpush("DMC", JSON.stringify(strategy));
            }

            return res.status(200).json({
                success: true,
                message: "Strategy is already in watch mode",
                data: strategy
            });
        }

        // If not active, activate it and add to DMC list
        strategy.active = true;
        const saveResult = await strategy.save();

        let existingList = await client.lrange("DMC", 0, -1);
        existingList = existingList.map(item => JSON.parse(item));
        const isPresent = existingList.some(item => item._id === saveResult._id.toString());

        if (!isPresent) {
            await client.lpush("DMC", JSON.stringify(saveResult));
        }

        return res.status(200).json({
            success: true,
            message: "Strategy is now in watching mode",
            data: saveResult
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });
    }
};