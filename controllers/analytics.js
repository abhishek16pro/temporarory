import ApiResponse from "../../shared/utils/apiResponse.js";
import positionMtm from "../models/positionMtm.js";
import account from "../models/account.js";
import {
    getClientPositions
} from "../controllers/positions.js";
import {
    buildDynamicPipeline,
    getPagedResults,
    getCollectionStats
} from "../utils/mongoPipelines.js";
import xlsx from 'xlsx'; // Add this import for Excel functionality


export const getMtmAnalytics = async (req, res) => {
    try {
        const {
            days = 30
        } = req.query;

        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - parseInt(days));

        const pipeline = buildDynamicPipeline({
                createdAt: {
                    $gte: fromDate
                }
            },
            null,
            null, {
                date: 1
            }
        );

        const mtmData = await positionMtm.aggregate(pipeline);

        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "MTM analytics data fetched successfully",
                data: mtmData,
            }).toObject(),
        );
    } catch (error) {
        console.error("Error in getting MTM analytics:", error.message || error);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: error.message,
            }).toObject(),
        );
    }
};


export const getClientWiseMtmAnalytics = async (req, res) => {
    try {
        const {
            days = 30, clientId
        } = req.query;

        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - parseInt(days));

        const matchConditions = {
            createdAt: {
                $gte: fromDate
            }
        };

        if (clientId) {
            matchConditions["clientId.userId"] = clientId;
        }

        const pipeline = buildDynamicPipeline(
            matchConditions, {
                clientId: 1,
                mtm: 1,
                date: 1,
                totalBuyQuantity: 1,
                totalSellQuantity: 1,
                netQuantity: 1
            },
            null, // No lookups needed
            {
                date: 1
            } // Sort by date
        );

        const mtmData = await positionMtm.aggregate(pipeline);

        const clientWiseData = {};
        mtmData.forEach(entry => {
            const userId = entry.clientId.userId;
            if (!clientWiseData[userId]) {
                clientWiseData[userId] = {
                    clientInfo: entry.clientId,
                    data: []
                };
            }
            clientWiseData[userId].data.push({
                mtm: entry.mtm,
                date: entry.date,
                totalBuyQuantity: entry.totalBuyQuantity,
                totalSellQuantity: entry.totalSellQuantity,
                netQuantity: entry.netQuantity
            });
        });

        const result = Object.values(clientWiseData);

        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "Client-wise MTM analytics data fetched successfully",
                data: result,
            }).toObject(),
        );
    } catch (error) {
        console.error("Error in getting client-wise MTM analytics:", error.message || error);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: error.message,
            }).toObject(),
        );
    }
};


export const getLatestMtmData = async (req, res) => {
    try {
        const pipeline = [{
                $sort: {
                    date: -1
                }
            },
            {
                $group: {
                    _id: "$clientId.userId",
                    latestEntry: {
                        $first: "$$ROOT"
                    }
                }
            },
            {
                $replaceRoot: {
                    newRoot: "$latestEntry"
                }
            }
        ];

        const uniqueClients = await positionMtm.aggregate(pipeline);

        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "Latest MTM data fetched successfully",
                data: uniqueClients,
            }).toObject(),
        );
    } catch (error) {
        console.error("Error in getting latest MTM data:", error.message || error);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: error.message,
            }).toObject(),
        );
    }
};


export const getClientMtmHistory = async (req, res) => {
    try {
        const {
            clientId,
            days = 30
        } = req.params;

        if (!clientId) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Client ID is required",
                }).toObject(),
            );
        }

        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - parseInt(days));

        const pipeline = buildDynamicPipeline({
                "clientId.userId": clientId,
                date: {
                    $gte: fromDate
                }
            },
            null, // No projection needed
            null, // No lookups needed
            {
                date: 1
            } // Sort by date
        );

        const mtmHistory = await positionMtm.aggregate(pipeline);

        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "Client MTM history fetched successfully",
                data: mtmHistory,
            }).toObject(),
        );
    } catch (error) {
        console.error("Error in getting client MTM history:", error.message || error);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: error.message,
            }).toObject(),
        );
    }
};


export const getClientMtmChart = async (req, res) => {
    try {
        const {
            clientId,
            days = 30
        } = req.params;

        if (!clientId) {
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Client ID is required",
                }).toObject(),
            );
        }

        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - parseInt(days));

        const pipeline = buildDynamicPipeline({
                "clientId.userId": clientId,
                date: {
                    $gte: fromDate
                }
            }, {
                date: 1,
                mtm: 1,
                totalBuyQuantity: 1,
                totalSellQuantity: 1,
                netQuantity: 1
            },
            null, // No lookups needed
            {
                date: 1
            } // Sort by date
        );

        const mtmHistory = await positionMtm.aggregate(pipeline);

        const chartData = mtmHistory.map(entry => ({
            date: entry.date,
            mtm: entry.mtm,
            totalBuyQuantity: entry.totalBuyQuantity,
            totalSellQuantity: entry.totalSellQuantity,
            netQuantity: entry.netQuantity
        }));

        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "Client MTM chart data fetched successfully",
                data: chartData,
            }).toObject(),
        );
    } catch (error) {
        console.error("Error in getting client MTM chart data:", error.message || error);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: error.message,
            }).toObject(),
        );
    }
};


export const getAllClientsMtmChart = async (req, res) => {
    try {
        const {
            days = 30
        } = req.query;

        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - parseInt(days));

        // Use optimized pipeline for better performance
        const pipeline = buildDynamicPipeline({
                date: {
                    $gte: fromDate
                }
            }, {
                clientId: 1,
                date: 1,
                mtm: 1
            },
            null, // No lookups needed
            {
                date: 1
            } // Sort by date
        );

        const mtmData = await positionMtm.aggregate(pipeline);

        const clientChartData = {};
        mtmData.forEach(entry => {
            const userId = entry.clientId.userId;
            const clientName = entry.clientId.firstName || userId;

            if (!clientChartData[userId]) {
                clientChartData[userId] = {
                    clientId: userId,
                    clientName: clientName,
                    data: []
                };
            }

            clientChartData[userId].data.push({
                date: entry.date,
                mtm: entry.mtm
            });
        });

        const result = Object.values(clientChartData);

        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "All clients MTM chart data fetched successfully",
                data: result,
            }).toObject(),
        );
    } catch (error) {
        console.error("Error in getting all clients MTM chart data:", error.message || error);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: error.message,
            }).toObject(),
        );
    }
}


export const triggerSaveMtmPositions = async (req, res) => {
    try {
        console.log(`[MANUAL] Starting manual MTM positions save request at ${new Date().toISOString()}`);

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        // Use optimized pipeline for better performance
        const countPipeline = buildDynamicPipeline({
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });

        const existingRecords = await positionMtm.countDocuments({
            date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });

        if (existingRecords > 0) {
            console.log(`[MANUAL] MTM positions for today already exist (${existingRecords} records found)`);
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 409,
                    message: "MTM positions for today already exist",
                    data: {
                        existingRecords
                    }
                }).toObject(),
            );
        }

        const clientPositions = await getClientPositions();

        if (!clientPositions || clientPositions.length === 0) {
            console.log('[MANUAL] No client positions found to save');
            return res.send(
                new ApiResponse({
                    success: false,
                    statusCode: 404,
                    message: "No client positions found to save",
                }).toObject(),
            );
        }

        const savePromises = clientPositions.map(clientPosition => {
            const mtmData = {
                clientId: clientPosition.clientId,
                mtm: clientPosition.mtm,
                positions: clientPosition.positions,
                totalBuyQuantity: clientPosition.totalBuyQuantity,
                totalSellQuantity: clientPosition.totalSellQuantity,
                netQuantity: clientPosition.netQuantity,
                date: new Date()
            };

            const newPositionMtm = new positionMtm(mtmData);
            return newPositionMtm.save();
        });

        await Promise.all(savePromises);

        console.log(`[MANUAL] Successfully saved MTM positions for ${clientPositions.length} clients`);
        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: `Successfully saved MTM positions for ${clientPositions.length} clients`,
                data: {
                    savedRecords: clientPositions.length
                }
            }).toObject(),
        );
    } catch (error) {
        console.error('[MANUAL] MTM positions save request failed:', error);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: error.message,
            }).toObject(),
        );
    }
};

// New endpoint to get statistics about MTM data
export const getMtmStatistics = async (req, res) => {
    try {
        const {
            days = 30
        } = req.query;

        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - parseInt(days));

        // Use optimized pipeline for getting statistics
        const pipeline = getCollectionStats("clientId.userId");

        const stats = await positionMtm.aggregate(pipeline);

        return res.send(
            new ApiResponse({
                success: true,
                statusCode: 200,
                message: "MTM statistics fetched successfully",
                data: stats,
            }).toObject(),
        );
    } catch (error) {
        console.error("Error in getting MTM statistics:", error.message || error);
        return res.send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: error.message,
            }).toObject(),
        );
    }
};

// New endpoint to download MTM data for a specific month in JSON or Excel format
export const downloadMonthlyMtmData = async (req, res) => {
    try {
        const { month, year, format = 'json' } = req.query;

        if (!month || !year) {
            return res.status(400).send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Month and year are required",
                }).toObject(),
            );
        }

        // Validate month (1-12)
        const monthNum = parseInt(month);
        if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
            return res.status(400).send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Invalid month. Must be between 1 and 12",
                }).toObject(),
            );
        }

        // Validate year
        const yearNum = parseInt(year);
        if (isNaN(yearNum) || yearNum < 2020 || yearNum > new Date().getFullYear() + 1) {
            return res.status(400).send(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "Invalid year",
                }).toObject(),
            );
        }

        // Create date range for the specified month
        const startDate = new Date(yearNum, monthNum - 1, 1); // First day of month
        const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999); // Last day of month

        // Build pipeline to fetch data for the specified month
        const pipeline = buildDynamicPipeline({
                date: {
                    $gte: startDate,
                    $lte: endDate
                }
            },
            null, // No projection needed
            null, // No lookups needed
            {
                date: 1
            } // Sort by date
        );

        const mtmData = await positionMtm.aggregate(pipeline);

        if (!mtmData || mtmData.length === 0) {
            return res.status(404).send(
                new ApiResponse({
                    success: false,
                    statusCode: 404,
                    message: "No MTM data found for the specified month",
                }).toObject(),
            );
        }

        // Format data for export
        const formattedData = mtmData.map(item => ({
            date: item.date,
            clientId: item.clientId?.userId || '',
            clientName: item.clientId?.firstName || '',
            mtm: item.mtm,
            totalBuyQuantity: item.totalBuyQuantity || 0,
            totalSellQuantity: item.totalSellQuantity || 0,
            netQuantity: item.netQuantity || 0,
            positions: item.positions?.length || 0
        }));

        // Return data in requested format
        if (format.toLowerCase() === 'xlsx') {
            // Create Excel workbook
            const workbook = xlsx.utils.book_new();
            
            // Create summary worksheet
            const summaryData = formattedData.map(item => ({
                Date: item.date,
                ClientID: item.clientId,
                ClientName: item.clientName,
                MTM: item.mtm,
                TotalBuyQty: item.totalBuyQuantity,
                TotalSellQty: item.totalSellQuantity,
                NetQty: item.netQuantity,
                Positions: item.positions
            }));
            const summaryWorksheet = xlsx.utils.json_to_sheet(summaryData);
            xlsx.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');
            
            // Group data by client ID for separate worksheets
            const clientDataMap = {};
            let netPnlByClient = {};
            
            formattedData.forEach(item => {
                const clientId = item.clientId || 'Unknown';
                if (!clientDataMap[clientId]) {
                    clientDataMap[clientId] = [];
                    netPnlByClient[clientId] = 0;
                }
                clientDataMap[clientId].push({
                    Date: item.date,
                    ClientID: item.clientId,
                    ClientName: item.clientName,
                    MTM: item.mtm,
                    TotalBuyQty: item.totalBuyQuantity,
                    TotalSellQty: item.totalSellQuantity,
                    NetQty: item.netQuantity,
                    Positions: item.positions
                });
                // Calculate net PNL for each client
                netPnlByClient[clientId] += item.mtm;
            });
            
            // Create separate worksheet for each client
            Object.keys(clientDataMap).forEach(clientId => {
                const clientWorksheet = xlsx.utils.json_to_sheet(clientDataMap[clientId]);
                // Limit worksheet name to 31 characters (Excel limitation)
                const sheetName = clientId.substring(0, 28) + (clientId.length > 28 ? '...' : '');
                xlsx.utils.book_append_sheet(workbook, clientWorksheet, sheetName);
            });
            
            // Create Net PNL Summary worksheet
            const netPnlSummary = Object.keys(netPnlByClient).map(clientId => ({
                ClientID: clientId,
                ClientName: clientDataMap[clientId][0]?.clientName || '',
                NetPNL: netPnlByClient[clientId]
            }));
            const netPnlWorksheet = xlsx.utils.json_to_sheet(netPnlSummary);
            xlsx.utils.book_append_sheet(workbook, netPnlWorksheet, 'Net PNL Summary');
            
            // Generate buffer
            const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
            
            // Set headers for Excel download
            const filename = `mtm_data_${yearNum}_${monthNum.toString().padStart(2, '0')}.xlsx`;
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            
            // Send Excel file
            return res.send(buffer);
        } else {
            // Default to JSON format
            const filename = `mtm_data_${yearNum}_${monthNum.toString().padStart(2, '0')}.json`;
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            
            // Send JSON data
            return res.send(JSON.stringify(formattedData, null, 2));
        }
    } catch (error) {
        console.error("Error in downloading monthly MTM data:", error.message || error);
        return res.status(500).send(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: error.message,
            }).toObject(),
        );
    }
};