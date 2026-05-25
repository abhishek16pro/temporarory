import { axiosFetch, getAuthToken } from "../utils/index.js";
import ApiResponse from "../../shared/utils/apiResponse.js";
import dotenv from "dotenv";
import account from "../models/account.js";
import redisConnect from "../utils/redisConnect.js";
import { promisify } from "util";
dotenv.config();

const redisClient = redisConnect();
const getAsync = promisify(redisClient.get).bind(redisClient);

const config = {
    headers: {
        Authorization: "",
        "Content-Type": "application/json",
    },
};


async function getPriceByExchangeInstrumentId(exchangeInstrumentId) {
    try {
        const data = await getAsync(String(exchangeInstrumentId));
        if (!data) {
            throw new Error(`No price data found for instrument ${exchangeInstrumentId}`);
        }
        const parsedData = JSON.parse(data);
        return parsedData.LTP_Rate;
    } catch (error) {
        console.log(`Failed to get price for instrument ${exchangeInstrumentId}: ${error.message}`);
        throw error;
    }
}


function DOWN_ltp(price, percentage) {
    const adjustedPrice = price * (1 - Math.abs(percentage / 100));
    return Math.round(adjustedPrice * 20) / 20;
}


function UP_ltp(price, percentage) {
    const adjustedPrice = price * (1 + Math.abs(percentage / 100));
    return Math.round(adjustedPrice * 20) / 20;
}


export const placeOrder = async (req, res) => {
    try {
        const { orderId, clientId, price, quantity } = req.body;

        if (!orderId || !clientId) {
            return res.status(400).json(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "orderId and clientId are required",
                }).toObject()
            );
        }

        const clientDetails = await account.findOne({ userId: clientId });
        if (!clientDetails) {
            return res.status(404).json(
                new ApiResponse({
                    success: false,
                    statusCode: 404,
                    message: "Client not found",
                }).toObject()
            );
        }

        const isDealer = clientDetails?.isDealer;
        const brokerUrl = clientDetails?.brokerUrl;

        config.headers.Authorization = await getAuthToken(clientId);

        const orderStatusUrl = `${brokerUrl}/interactive/orders?appOrderID=${orderId}`;
        const { data: orderData } = await axiosFetch(orderStatusUrl, "GET", config);
        
        if (!orderData || !Array.isArray(orderData) || orderData.length === 0) {
            return res.status(404).json(
                new ApiResponse({
                    success: false,
                    statusCode: 404,
                    message: "Order not found",
                }).toObject()
            );
        }

        const orderStatusObj = orderData[orderData.length - 1];
        const { 
            ExchangeInstrumentID, 
            AppOrderID, 
            ProductType, 
            OrderType, 
            OrderQuantity, 
            OrderSide,
            OrderStopPrice,
            OrderStatus
        } = orderStatusObj;

        // if (OrderStatus !== "New" && OrderStatus !== "PendingNew") {
        //     return res.status(400).json(
        //         new ApiResponse({
        //             success: false,
        //             statusCode: 400,
        //             message: `Order status is ${OrderStatus}. Only orders with status "New" or "PendingNew" can be modified.`,
        //         }).toObject()
        //     );
        // }

        let limitPrice;
        
        if (price !== undefined && price !== null) {
            limitPrice = price;
        } else {
            const currentPrice = await getPriceByExchangeInstrumentId(ExchangeInstrumentID);
            limitPrice = OrderSide === "SELL" ? DOWN_ltp(currentPrice, 5) : UP_ltp(currentPrice, 5);
        }

        // Use provided quantity or fallback to original order quantity
        const modifiedQuantity = quantity !== undefined ? parseInt(quantity) : OrderQuantity;

        const requestBody = {
            appOrderID: AppOrderID,
            modifiedProductType: ProductType,
            modifiedOrderType: OrderType.toUpperCase(),
            modifiedOrderQuantity: modifiedQuantity,
            modifiedDisclosedQuantity: 0,
            modifiedLimitPrice: limitPrice,
            modifiedStopPrice: OrderStopPrice,
            modifiedTimeInForce: "DAY",
            clientID: isDealer ? "*****" : clientId,
        };

        const response = await axiosFetch(
            `${brokerUrl}/interactive/orders`,
            "PUT",
            config,
            requestBody
        );

        return res.status(200).json(
            new ApiResponse({
                success: response.success,
                statusCode: 200,
                message: response.message || "Order modified successfully",
                data: response.data,
            }).toObject()
        );
    } catch (error) {
        console.error("Error modifying order:", error.message);
        
        return res.status(500).json(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: `Error modifying order: ${error.message}`,
            }).toObject()
        );
    }
};


export const cancelOrder = async (req, res) => {
    try {
        const { orderId, clientId } = req.body;

        if (!orderId || !clientId) {
            return res.status(400).json(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "orderId and clientId are required",
                }).toObject()
            );
        }

        const clientDetails = await account.findOne({ userId: clientId });
        if (!clientDetails) {
            return res.status(404).json(
                new ApiResponse({
                    success: false,
                    statusCode: 404,
                    message: "Client not found",
                }).toObject()
            );
        }

        const brokerUrl = clientDetails?.brokerUrl;

        const cancelUrl = `${brokerUrl}/interactive/orders?appOrderID=${orderId}&clientID=${clientId}`;

        config.headers.Authorization = await getAuthToken(clientId);
        
        const response = await axiosFetch(
            cancelUrl,
            "DELETE",
            config
        );

        return res.status(200).json(
            new ApiResponse({
                success: response.success,
                statusCode: 200,
                message: response.message || "Order cancelled successfully",
                data: response.data,
            }).toObject()
        );
    } catch (error) {
        console.error("Error cancelling order:", error.message);
        
        return res.status(500).json(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: `Error cancelling order: ${error.message}`,
            }).toObject()
        );
    }
};


export const cancelAllOrders = async (req, res) => {
    try {
        const { orders } = req.body; 

        if (!Array.isArray(orders) || orders.length === 0) {
            return res.status(400).json(
                new ApiResponse({
                    success: false,
                    statusCode: 400,
                    message: "orders array is required and cannot be empty",
                }).toObject()
            );
        }

        for (const order of orders) {
            if (!order.orderId || !order.clientId) {
                return res.status(400).json(
                    new ApiResponse({
                        success: false,
                        statusCode: 400,
                        message: "Each order must have orderId and clientId",
                    }).toObject()
                );
            }
        }

        const cancellationResults = [];
        let successCount = 0;
        let errorCount = 0;

        for (const order of orders) {
            try {
                const clientDetails = await account.findOne({ userId: order.clientId });
                if (!clientDetails) {
                    cancellationResults.push({
                        orderId: order.orderId,
                        clientId: order.clientId,
                        success: false,
                        message: "Client not found"
                    });
                    errorCount++;
                    continue;
                }

                const brokerUrl = clientDetails?.brokerUrl;
                const cancelUrl = `${brokerUrl}/interactive/orders?appOrderID=${order.orderId}&clientID=${order.clientId}`;

                config.headers.Authorization = await getAuthToken(order.clientId);
                
                const response = await axiosFetch(
                    cancelUrl,
                    "DELETE",
                    config
                );

                if (response.success) {
                    successCount++;
                } else {
                    errorCount++;
                }

                cancellationResults.push({
                    orderId: order.orderId,
                    clientId: order.clientId,
                    success: response.success,
                    message: response.message || "Order cancelled successfully"
                });
            } catch (error) {
                errorCount++;
                cancellationResults.push({
                    orderId: order.orderId,
                    clientId: order.clientId,
                    success: false,
                    message: `Error cancelling order: ${error.message}`
                });
            }
        }

        const message = `Cancelled ${successCount} out of ${orders.length} orders`;
        const overallSuccess = errorCount === 0;

        return res.status(200).json(
            new ApiResponse({
                success: overallSuccess,
                statusCode: 200,
                message: message,
                data: {
                    results: cancellationResults,
                    summary: {
                        total: orders.length,
                        success: successCount,
                        failed: errorCount
                    }
                },
            }).toObject()
        );
    } catch (error) {
        console.error("Error cancelling orders:", error.message);
        
        return res.status(500).json(
            new ApiResponse({
                success: false,
                statusCode: 500,
                message: `Error cancelling orders: ${error.message}`,
            }).toObject()
        );
    }
};