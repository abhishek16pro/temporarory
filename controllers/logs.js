import Log from "../models/logs.js";

const getLogs = async (req, res) => {
    try {
        console.log("here");
        
        const { page = 1, limit = 10, name, key, type, message } = req.query;

        // Build filter object
        const filter = {};
        if (name) {
            filter.name = { $regex: name, $options: 'i' };
        }
        if (key) {
            filter.key = { $regex: key, $options: 'i' };
        }
        if (type) {
            filter.type = { $regex: type, $options: 'i' };
        }
        if (message) {
            filter.message = { $regex: message, $options: 'i' };
        }

        // Get total count
        const totalLogs = await Log.countDocuments(filter);
        const totalPages = Math.ceil(totalLogs / limit);

        // Get paginated results, sorted by time descending
        const logs = await Log.find(filter)
            .sort({ time: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .lean();

        res.status(200).json({
            success: true,
            data: {
                logs,
                totalPages,
                currentPage: parseInt(page),
                totalLogs
            }
        });
    } catch (error) {
        console.error("Error fetching logs:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch logs",
            error: error.message
        });
    }
};

export { getLogs };