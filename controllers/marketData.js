import Index from "../models/index.js";
import ApiResponse from "../../shared/utils/apiResponse.js";
import datafeedKeys from "../models/datafeedKeys.js";

const SEED_DATA = [
    { name: "NIFTY", token: 26000, atmKey: "NFATM", strikeDiff: 50, exchangeSegment: "NSECM", saveHistorical: false, subscribeStrikeLimit: 20 },
    { name: "BANKNIFTY", token: 26001, atmKey: "BNATM", strikeDiff: 100, exchangeSegment: "NSECM", saveHistorical: false, subscribeStrikeLimit: 20 },
    { name: "SENSEX", token: 26065, atmKey: "SXATM", strikeDiff: 100, exchangeSegment: "BSECM", saveHistorical: false, subscribeStrikeLimit: 20 },
    { name: "MIDCPNIFTY", token: 26005, atmKey: "MCPATM", strikeDiff: 120, exchangeSegment: "NSECM", saveHistorical: false, subscribeStrikeLimit: 20 },
    { name: "FINNIFTY", token: 26034, atmKey: "FNATM", strikeDiff: 50, exchangeSegment: "NSECM", saveHistorical: false, subscribeStrikeLimit: 20 },
];

export const getAllIndices = async (req, res) => {
    try {
        const indices = await Index.find().sort({ name: 1 });

        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "Indices fetched successfully",
                data: indices
            }).toObject()
        );
    } catch (error) {
        console.error("Error fetching indices:", error);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: "Error fetching indices",
                error: error.message
            }).toObject()
        );
    }
};

export const createIndex = async (req, res) => {
    try {
        const { name, token, atmKey, strikeDiff, exchangeSegment, saveHistorical = false, subscribeStrikeLimit = 0, active = true } = req.body;
        const validNames = SEED_DATA.map(s => s.name);

        if (!name || !token || !atmKey || !strikeDiff || !exchangeSegment || typeof saveHistorical !== 'boolean' || subscribeStrikeLimit === undefined) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "All index fields are required"
                }).toObject()
            );
        }

        if (!validNames.includes(name)) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: `Invalid index name. Must be one of: ${validNames.join(", ")}`
                }).toObject()
            );
        }

        const existingIndex = await Index.findOne({ name });
        if (existingIndex) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 409,
                    message: "Index already exists"
                }).toObject()
            );
        }

        const newIndex = new Index({
            name,
            token,
            atmKey,
            strikeDiff,
            exchangeSegment,
            saveHistorical,
            subscribeStrikeLimit,
            active,
            lastUpdated: new Date()
        });
        await newIndex.save();

        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 201,
                message: "Index created successfully",
                data: newIndex
            }).toObject()
        );
    } catch (error) {
        console.error("Error creating index:", error);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: "Error creating index",
                error: error.message
            }).toObject()
        );
    }
};

export const updateIndex = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, token, atmKey, strikeDiff, exchangeSegment, saveHistorical, subscribeStrikeLimit, active } = req.body;
        const validNames = SEED_DATA.map(s => s.name);

        if (!id) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Index id is required"
                }).toObject()
            );
        }

        if (!name || !token || !atmKey || !strikeDiff || !exchangeSegment || typeof saveHistorical !== 'boolean' || subscribeStrikeLimit === undefined) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "All index fields are required"
                }).toObject()
            );
        }

        if (!validNames.includes(name)) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: `Invalid index name. Must be one of: ${validNames.join(", ")}`
                }).toObject()
            );
        }

        const index = await Index.findById(id);
        if (!index) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 404,
                    message: "Index not found"
                }).toObject()
            );
        }

        if (index.name !== name) {
            const duplicate = await Index.findOne({ name });
            if (duplicate) {
                return res.send(
                    new ApiResponse({
                        success: false,
                        statusCode: 409,
                        message: "Another index with this name already exists"
                    }).toObject()
                );
            }
        }

        index.name = name;
        index.token = token;
        index.atmKey = atmKey;
        index.strikeDiff = strikeDiff;
        index.exchangeSegment = exchangeSegment;
        index.saveHistorical = saveHistorical;
        index.subscribeStrikeLimit = subscribeStrikeLimit;
        if (typeof active === "boolean") {
            index.active = active;
        }
        index.lastUpdated = new Date();
        await index.save();

        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "Index updated successfully",
                data: index
            }).toObject()
        );
    } catch (error) {
        console.error("Error updating index:", error);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: "Error updating index",
                error: error.message
            }).toObject()
        );
    }
};

export const deleteIndex = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Index id is required"
                }).toObject()
            );
        }

        const deletedIndex = await Index.findByIdAndDelete(id);
        if (!deletedIndex) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 404,
                    message: "Index not found"
                }).toObject()
            );
        }

        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "Index deleted successfully",
                data: deletedIndex
            }).toObject()
        );
    } catch (error) {
        console.error("Error deleting index:", error);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: "Error deleting index",
                error: error.message
            }).toObject()
        );
    }
};

export const seedIndices = async (req, res) => {
    try {
        const results = [];

        for (const seed of SEED_DATA) {
            const existing = await Index.findOne({ name: seed.name });
            if (!existing) {
                const newIndex = new Index({
                    ...seed,
                    active: true,
                    lastUpdated: new Date()
                });
                await newIndex.save();
                results.push({ name: seed.name, status: "created" });
            } else {
                results.push({ name: seed.name, status: "already exists" });
            }
        }

        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "Indices seeded successfully",
                data: results
            }).toObject()
        );
    } catch (error) {
        console.error("Error seeding indices:", error);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: "Error seeding indices",
                error: error.message
            }).toObject()
        );
    }
};

export const getAllDataFeedKeys = async (req, res) => {
    try {
        // dont send apikey secrent and and url
        const data = await datafeedKeys.find({}, { appKey: 0, secretKey: 0, url: 0 }).sort({ priority: 1 });
        // console.log("1010", data);

        return res.status(200).send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "Data fetched successfully",
                data: data
            }).toObject()
        )
    } catch (error) {
        console.error("getAllDataFeedKeys error:", error);
        return res.status(200).send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: "Error during the data processing",
                data: error.message
            }).toObject()
        )
    }
}

export const addDataFeedKeys = async (req, res) => {
    try {
        const { clientid, appKey, secretKey, source, url, subscriptionLimit, active, priority } = req.body;

        // Validation
        if (!clientid || !appKey || !secretKey || !source || !url || !subscriptionLimit) {
            return res.status(400).json({
                success: false,
                message: "clientId, appKey, secretKey, source, url, subscriptionLimit are required"
            });
        }

        // Check duplicate
        const existing = await datafeedKeys.findOne({ appKey });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: "API with this appKey already exists"
            });
        }

        // Create
        const newDatafeedKeys = new datafeedKeys({
            clientid,
            appKey,
            secretKey,
            source,
            url: `${url}/apimarketdata`,
            subscriptionLimit,
            active: active ?? true,
            priority: priority ?? 1
        });

        const savedData = await newDatafeedKeys.save();

        return res.status(201).json({
            success: true,
            message: "DataFeed API created successfully",
            data: savedData
        });

    } catch (error) {
        console.error("Error creating DataFeed API:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
            error: error.message
        });
    }
}

export const updateDataFeedKeys = async (req, res) => {
    try {
        const { id } = req.params;

        console.log("id1103", id, req.body);
        const updated = await datafeedKeys.findByIdAndUpdate(
            id,
            {
                clientid: req.body.clientid,
                appKey: req.body.appKey,
                secretKey: req.body.secretKey,
                source: req.body.source,
                url: req.body.url,
                subscriptionLimit: req.body.subscriptionLimit,
                priority: req.body.priority,
                active: req.body.active
            },
            {
                new: true,          // return updated doc
                runValidators: true // enforce schema validation
            }
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "API not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "API updated successfully",
            data: updated
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
}

export const deleteDataFeedKeys = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await datafeedKeys.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "API not found"
            });
        }
        res.status(200).json({
            success: true,
            message: "API deleted successfully",
            data: deleted
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
}