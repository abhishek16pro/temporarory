import ApiResponse from "../../shared/utils/apiResponse.js";
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import redisConnect from "../utils/redisConnect.js";

const redis = redisConnect();

/**
 * Calculates PnL for a single trade
 */
function getPnl(trade) {
    if (!trade.entryLtp || trade.entryLtp === 0 || trade.orderStatus !== "Completed") {
        return 0;
    }

    if (!trade.symbol) {
        console.warn("Trade missing symbol:", trade);
        return 0;
    }

    if (!trade.exitLtp || trade.exitLtp === 0) {
        return 0;
    }

    const lotSizeMap = {
        "BANKNIFTY": process.env.BNLot,
        "NIFTY": process.env.NFLot,
        "FINNIFTY": process.env.FNLot,
        "MIDCPNIFTY": process.env.MCNLot,
        "SENSEX": process.env.SXLot
    };

    let lotSize = 1;
    Object.keys(lotSizeMap).forEach(index => {
        if (trade.symbol && trade.symbol.includes(index)) {
            lotSize = parseInt(lotSizeMap[index]) || 1;
        }
    });

    const lot = parseInt(trade.lot) || 1;
    const entryPrice = parseFloat(trade.entryLtp) || 0;
    const exitPrice = parseFloat(trade.exitLtp) || 0;

    const pnl = trade.side === "B"
        ? (exitPrice - entryPrice) * lotSize * lot
        : (entryPrice - exitPrice) * lotSize * lot;

    if (isNaN(pnl)) {
        console.warn("NaN PnL for trade:", trade);
        return 0;
    }

    return parseFloat(pnl.toFixed(2));
}

/**
 * Applies styles to a worksheet (Header, Borders, Conditional PnL)
 */
const styleWorksheet = (worksheet, pnlColumnIndex, statusColumnIndex = null) => {
    // 1. Header Styling
    const headerRow = worksheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4472C4' } // Blue header
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
        };
    });

    // 2. Data Styling (Borders and Conditional Formatting)
    worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        // Apply borders to all cells in the row
        row.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.alignment = { vertical: 'middle', horizontal: 'left' };
        });

        // PnL Coloring
        const pnlCell = row.getCell(pnlColumnIndex);
        const pnlValue = parseFloat(pnlCell.value);

        // Define styles
        const successStyle = {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2EFDA' } }, // Light Green
            font: { color: { argb: 'FF006100' } } // Dark Green Text
        };
        const dangerStyle = {
            fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC7CE' } }, // Light Red
            font: { color: { argb: 'FF9C0006' } } // Dark Red Text
        };

        // Apply to PnL Cell based on value
        if (pnlValue > 0) {
            pnlCell.fill = successStyle.fill;
            pnlCell.font = successStyle.font;
        } else if (pnlValue < 0) {
            pnlCell.fill = dangerStyle.fill;
            pnlCell.font = dangerStyle.font;
        }

        // Apply to Status Cell (if provided) - e.g., if Failed/Error
        if (statusColumnIndex) {
            const statusCell = row.getCell(statusColumnIndex);
            if (statusCell.value !== 'Completed' && statusCell.value !== 'TOTAL') {
                statusCell.font = { color: { argb: 'FFFF0000' }, bold: true };
            }
        }
    });
};

export const getHistoryTrades = async (req, res) => {
    try {
        const stgLogs = mongoose.connection.collection('stgLogs');
        const trades = await stgLogs.find({}).toArray();

        if (!trades || trades.length === 0) {
            return res.send(new ApiResponse({
                success: false,
                statusCode: 404,
                message: "No trades found"
            }).toObject());
        }

        const clientTrades = {};
        const strategyPnl = {};

        // Process Data
        trades.forEach(trade => {
            if (!trade.entryLtp || trade.entryLtp === 0) return;
            if (!trade.clientId) return;

            if (!clientTrades[trade.clientId]) {
                clientTrades[trade.clientId] = [];
            }

            const pnl = getPnl(trade);

            clientTrades[trade.clientId].push({
                ...trade,
                pnl
            });

            if (trade.orderStatus === "Completed") {
                const strategy = trade.name || "UNKNOWN";
                if (!strategyPnl[strategy]) strategyPnl[strategy] = 0;
                strategyPnl[strategy] += pnl;
            }
        });

        // Initialize Workbook
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'TradingSystem';
        workbook.created = new Date();

        // --- 1. Generate Client Sheets ---
        Object.entries(clientTrades).forEach(([clientId, clientTradeList]) => {
            const sanitizedClientId = String(clientId).replace(/[:\\/?*\[\]]/g, '_').substring(0, 31);
            const worksheet = workbook.addWorksheet(sanitizedClientId);

            // Define Columns
            worksheet.columns = [
                { header: 'Strategy Name', key: 'name', width: 25 },
                { header: 'Symbol', key: 'symbol', width: 20 },
                { header: 'Side', key: 'side', width: 8 },
                { header: 'Lots', key: 'lot', width: 8 },
                { header: 'Entry Price', key: 'entryLtp', width: 12 },
                { header: 'Exit Price', key: 'exitLtp', width: 12 },
                { header: 'Entry Time', key: 'entryTime', width: 22 },
                { header: 'Exit Time', key: 'exitTime', width: 22 },
                { header: 'Status', key: 'orderStatus', width: 15 },
                { header: 'PnL', key: 'pnl', width: 15 }
            ];

            // Add Rows
            let totalPnL = 0;
            clientTradeList.forEach(trade => {
                worksheet.addRow({
                    name: trade.name || '',
                    symbol: trade.symbol || '',
                    side: trade.side || '',
                    lot: trade.lot || 0,
                    entryLtp: trade.entryLtp || 0,
                    exitLtp: trade.exitLtp || 0,
                    entryTime: trade.entryTime || '',
                    exitTime: trade.exitTime || '',
                    orderStatus: trade.orderStatus || '',
                    pnl: trade.pnl || 0
                });

                if (trade.orderStatus === "Completed") {
                    totalPnL += (isNaN(trade.pnl) ? 0 : trade.pnl);
                }
            });

            // Add Total Row
            const totalRow = worksheet.addRow({
                name: 'TOTAL',
                pnl: parseFloat(totalPnL.toFixed(2))
            });
            totalRow.font = { bold: true };
            totalRow.getCell('name').alignment = { horizontal: 'right' };

            // Apply Styles (PnL is column 10, Status is column 9)
            styleWorksheet(worksheet, 10, 9);
        });

        // --- 2. Generate Strategy PnL Sheet ---
        const strategySheet = workbook.addWorksheet("StrategyPnL");
        strategySheet.columns = [
            { header: 'Strategy Name', key: 'strategy', width: 30 },
            { header: 'Total PnL', key: 'pnl', width: 20 }
        ];

        let totalStrategyPnL = 0;
        Object.entries(strategyPnl).forEach(([strategy, pnl]) => {
            const fixedPnL = parseFloat(pnl.toFixed(2));
            strategySheet.addRow({ strategy, pnl: fixedPnL });
            totalStrategyPnL += fixedPnL;
        });

        const stgTotalRow = strategySheet.addRow({
            strategy: 'TOTAL',
            pnl: parseFloat(totalStrategyPnL.toFixed(2))
        });
        stgTotalRow.font = { bold: true };

        // Apply Styles (PnL is column 2)
        styleWorksheet(strategySheet, 2);

        // --- 3. Send Response ---
        const currentDate = new Date();
        const dateStr = currentDate.toISOString().split('T')[0];
        const filename = `trading_pnl_${dateStr}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Write to buffer and send
        const buffer = await workbook.xlsx.writeBuffer();
        
        console.log("Excel file generated successfully");
        res.send(buffer);

    } catch (error) {
        console.error("Error in getting History Trades:", error);
        return res.send(new ApiResponse({
            success: false,
            statusCode: 500,
            message: "Internal Server Error",
            data: error.message
        }).toObject());
    }
};

export const allTradesDetails = async (req, res) => {
    try {
        const stgLogs = mongoose.connection.collection('stgLogs');
        const trades = await stgLogs.find({}).toArray();
        const redisKey = 'allTradesDetails';
        const cachedTrades = await redis.get(redisKey);

        if (cachedTrades) {
            return res.send(new ApiResponse({
                success: true,
                statusCode: 200,
                message: "Trades fetched successfully",
                data: JSON.parse(cachedTrades)
            }).toObject());
        }

        if (!trades || trades.length === 0) {
            return res.send(new ApiResponse({
                success: false,
                statusCode: 404,
                message: "No trades found"
            }).toObject());
        }

        const clientTrades = {};
        trades.forEach(trade => {
            if (!trade.entryLtp || trade.entryLtp === 0) return;

            if (!clientTrades[trade.clientId]) {
                clientTrades[trade.clientId] = [];
            }

            clientTrades[trade.clientId].push({
                clientId: trade.clientId,
                symbol: trade.symbol,
                entryTime: trade.entryTime,
                exitTime: trade.exitTime,
                entryPrice: trade.entryLtp,
                exitPrice: trade.exitLtp,
                quantity: trade.lot,
                pnl: getPnl(trade),
                strategy: trade.name,
                status: trade.orderStatus,
                leg: trade.leg,
                side: trade.side,
            });
        });

        const ttl = 60; // 60 seconds    
        await redis.set(redisKey, JSON.stringify(clientTrades), 'EX', ttl);

        return res.send(new ApiResponse({
            success: true,
            statusCode: 200,
            message: "Trades fetched successfully",
            data: clientTrades
        }).toObject());

    } catch (error) {
        console.error('Error fetching trade details:', error);
        return res.send(new ApiResponse({
            success: false,
            statusCode: 500,
            message: "Error fetching trade details"
        }).toObject());
    }
};