import { axiosFetch } from "./utils/index.js";
import axios from "axios";
import redisConnect from "./utils/redisConnect.js";
import connectDB from "./utils/connectMongo.js";
import { saveLog } from "../shared/utils/saveLogs.js";
import { promisify } from "util";
import dotenv from "dotenv";
import account from "./models/account.js";

dotenv.config();

class SquareOffService {
    constructor() {
        this.isRunning = false;
        this.redisClient = null;
        this.redisQueue = "SqoffProcessQueue";
        this.processedQueue = "SqoffProcessedQueue";
        this.AUTH_MAP = "auth";
        this.BROKER_MAP = "broker";
        this.REDIS_TIMEOUT = 10;
        this.MAX_RETRY_COUNT = 10;
        this.RETRY_DELAY = 1000;
        // this.BASE_URL = process.env.BASE_URL;
    }

    async initialize() {
        try {
            connectDB();
            this.redisClient = redisConnect();

            this.brpopAsync = promisify(this.redisClient.brpop).bind(this.redisClient);
            this.lpushAsync = promisify(this.redisClient.lpush).bind(this.redisClient);
            this.hgetAsync = promisify(this.redisClient.hget).bind(this.redisClient);
            this.getAsync = promisify(this.redisClient.get).bind(this.redisClient);
            console.log("SQUARE-OFF SERVICE INITIALIZED");

            saveLog("SqoffService", "INFO", "Square-off service initialized");
            return true;
        } catch (error) {
            saveLog("SqoffService", "ERROR", `Failed to initialize service: ${error.message}`);
            throw error;
        }
    }

    async getAuthTokenByClientId(clientId) {
        try {
            const token = await this.hgetAsync(this.AUTH_MAP, clientId);
            if (!token) {
                throw new Error(`No auth token found for client ${clientId}`);
            }
            return token;
        } catch (error) {
            saveLog("Auth", "ERROR", `Failed to get auth token for ${clientId}: ${error.message}`);
            throw error;
        }
    }

    async getBrokerUrlByClientId(clientId) {
        try {
            const cachedData = await this.hgetAsync(this.BROKER_MAP, clientId);
            if (cachedData) {
                const brokerData = JSON.parse(cachedData);
                if (brokerData) {
                    return brokerData;
                }
            }

            const accounts = await account.find({ userId: clientId }).lean();
            for (const acc of accounts) {
                let brokerData
                if (acc.isDealer) {
                    brokerData = {
                        brokerUrl: acc.brokerUrl, clientId: "*****"
                    }
                } else {
                    brokerData = {
                        brokerUrl: acc.brokerUrl, clientId: acc.userId
                    }
                }
                await this.redisClient.hset(this.BROKER_MAP, clientId, JSON.stringify(brokerData));
                return brokerData;
            }

            saveLog("Broker", "WARN", `No broker URL found for client ${clientId}`);
            return null;

        } catch (error) {
            saveLog("Broker", "ERROR", `Failed to get broker URL for ${clientId}: ${error.message}`);
            throw error;
        }
    }


    async getPriceByExchangeInstrumentId(exchangeInstrumentId) {
        try {
            const data = await this.getAsync(String(exchangeInstrumentId));
            if (!data) {
                throw new Error(`No price data found for instrument ${exchangeInstrumentId}`);
            }
            const parsedData = JSON.parse(data);
            // console.log(parsedData, "parsedData");

            return parsedData.LTP_Rate;
        } catch (error) {
            saveLog("Price", "ERROR", `Failed to get price for instrument ${exchangeInstrumentId}: ${error.message}`);
            console.log(`Failed to get price for instrument ${exchangeInstrumentId}: ${error.message}`);
            throw error;
        }
    }

    DOWN_ltp(price, percentage) {
        const adjustedPrice = price * (1 - Math.abs(percentage / 100));
        return Math.round(adjustedPrice * 20) / 20;
    }

    UP_ltp(price, percentage) {
        const adjustedPrice = price * (1 + Math.abs(percentage / 100));
        return Math.round(adjustedPrice * 20) / 20;
    }

    async placeSquareOffOrder(positionData) {
        try {
            const { AccountID, ExchangeInstrumentId, exchangeSegment, Quantity } = positionData;

            const brokerData = await this.getBrokerUrlByClientId(AccountID);
            const brokerUrl = brokerData.brokerUrl
            // console.log("getBrokerUrlByClientId", brokerData);

            const authToken = await this.getAuthTokenByClientId(AccountID);

            const currentPrice = await this.getPriceByExchangeInstrumentId(ExchangeInstrumentId);
            const isBuy = Quantity < 0;
            const orderSide = isBuy ? "BUY" : "SELL";

            const downBuffer = this.DOWN_ltp(currentPrice, 9);
            const upBuffer = this.UP_ltp(currentPrice, 9);

            const requestBody = {
                productType: "NRML",
                timeInForce: "DAY",
                disclosedQuantity: 0,
                exchangeSegment,
                orderType: "LIMIT",
                orderSide,
                exchangeInstrumentID: ExchangeInstrumentId,
                orderQuantity: Math.abs(Quantity),
                limitPrice: isBuy ? upBuffer : downBuffer,
                stopPrice: 0,
                clientID: brokerData.clientId
            };

            const config = {
                headers: {
                    Authorization: authToken,
                    "Content-Type": "application/json"
                }
            };

            const orderUrl = `${brokerUrl}/interactive/orders`;
            // console.log("requestBody", requestBody);
            // console.log("orderUrl", orderUrl);
            // console.log("config", config);

            const { success, statusCode, message, data } = await axiosFetch(orderUrl, "POST", config, requestBody);

            if (!success) {
                throw new Error(`Order placement failed: ${message} (${statusCode})`);
            }

            const orderId = data?.AppOrderID;
            if (!orderId) {
                throw new Error("Order placed but no order ID returned");
            }

            saveLog("Order", "INFO", `Placed square-off order ${orderId} for client ${AccountID}, ${orderSide} ${Math.abs(Quantity)} units`);

            return {
                orderId,
                status: "Pending",
                accountId: AccountID,
                brokerUrl,
                requestBody
            };
        } catch (error) {
            saveLog("Order", "ERROR", `Failed to place square-off order: ${error.message}`);
            throw error;
        }
    }

    async checkOrderStatus(orderId, clientId, brokerUrl) {
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const authToken = await this.getAuthTokenByClientId(clientId);
            const url = `${brokerUrl}/interactive/orders?appOrderID=${orderId}`;

            const config = {
                headers: {
                    Authorization: authToken,
                    "Content-Type": "application/json"
                }
            };

            const { data } = await axiosFetch(url, "GET", config);

            if (!data || !Array.isArray(data) || data.length === 0) {
                throw new Error(`No status found for order ${orderId}`);
            }

            const orderStatusObj = data[data.length - 1];
            return orderStatusObj;
        } catch (error) {
            saveLog("Status", "ERROR", `Failed to check status for order ${orderId}: ${error.message}`);
            throw error;
        }
    }

    async modifyOrder(orderObj, clientId, brokerUrl) {
        try {
            const { ExchangeInstrumentID, AppOrderID, ProductType, OrderType, OrderQuantity, OrderSide } = orderObj;

            const currentPrice = await this.getPriceByExchangeInstrumentId(ExchangeInstrumentID);

            const downBuffer = this.DOWN_ltp(currentPrice, 5);
            const upBuffer = this.UP_ltp(currentPrice, 5);

            const requestBody = {
                appOrderID: AppOrderID,
                modifiedProductType: ProductType,
                modifiedOrderType: "LIMIT",
                modifiedOrderQuantity: parseInt(OrderQuantity),
                modifiedDisclosedQuantity: 0,
                modifiedLimitPrice: OrderSide === "SELL" ? downBuffer : upBuffer,
                modifiedStopPrice: 0,
                modifiedTimeInForce: "DAY",
                clientID: "*****",
            };

            const authToken = await this.getAuthTokenByClientId(clientId);
            const config = {
                headers: {
                    Authorization: authToken,
                    "Content-Type": "application/json"
                }
            };

            const url = `${brokerUrl}/interactive/orders`;
            const { data } = await axiosFetch(url, "PUT", config, requestBody);

            saveLog("Modify", "INFO", `Successfully modified order ${AppOrderID} for client ${clientId}`);
            return data;
        } catch (error) {
            saveLog("Modify", "ERROR", `Failed to modify order ${orderObj?.AppOrderID} for client ${clientId}: ${error.message}`);
            throw error;
        }
    }

    async cancelOrder(orderId, clientId, brokerUrl) {
        try {
            const authToken = await this.getAuthTokenByClientId(clientId);
            const url = `${brokerUrl}/interactive/orders?appOrderID=${orderId}&clientID=${clientId}`;

            const config = {
                headers: {
                    Authorization: authToken,
                    "Content-Type": "application/json"
                }
            };

            const { data } = await axiosFetch(url, "DELETE", config);
            saveLog("Cancel", "INFO", `Successfully canceled order ${orderId} for client ${clientId}`);
            return data;
        } catch (error) {
            saveLog("Cancel", "ERROR", `Failed to cancel order ${orderId} for client ${clientId}: ${error.message}`);
            console.log(`Failed to cancel order ${orderId} for client ${clientId}: ${error.message}`);
            throw error;
        }
    }

    async processPositionUntilCompletion(positionData) {
        try {
            console.log("processPositionUntilCompletion", positionData);

            const updatedPosition = {
                ...positionData,
                status: "Pending",
            };

            const orderResult = await this.placeSquareOffOrder(updatedPosition);

            let currentPosition = {
                ...updatedPosition,
                orderId: orderResult.orderId,
                brokerUrl: orderResult.brokerUrl
            };

            await this.lpushAsync(this.redisQueue, JSON.stringify(currentPosition));

            return currentPosition;
        } catch (error) {
            console.log("processPositionUntilCompletion", error);

            const failedPosition = {
                ...positionData,
                retryCount: (positionData.retryCount || 0) + 1,
                status: "Failed",
                error: error.message
            };

            if (positionData.orderId) {
                await this.cancelOrder(positionData.orderId, positionData.AccountID, positionData.brokerUrl);
            }

            await this.lpushAsync(this.redisQueue, JSON.stringify(failedPosition));

            saveLog("Process", "ERROR", `Failed to process position for ${positionData.AccountID}: ${error.message}`);
            return failedPosition;
        }
    }

    async checkAndUpdatePositionStatus(positionData) {
        try {
            let { orderId, AccountID, brokerUrl, retryCount } = positionData;

            const orderStatus = await this.checkOrderStatus(orderId, AccountID, brokerUrl);

            if (orderStatus.OrderStatus === "Filled") {
                const completedPosition = {
                    ...positionData,
                    status: "Completed",
                    orderDetails: orderStatus
                };

                await this.lpushAsync(this.processedQueue, JSON.stringify(completedPosition));

                saveLog("Status", "INFO", `Position squared off successfully for client ${AccountID}, order ${orderId}`);
                return completedPosition;
            } else if (["PendingNew", "New", "Replaced"].includes(orderStatus.OrderStatus)) {
                if (retryCount < this.MAX_RETRY_COUNT) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    await this.modifyOrder(orderStatus, AccountID, brokerUrl);

                    const updatedPosition = {
                        ...positionData,
                        retryCount: retryCount + 1
                    };

                    await this.lpushAsync(this.redisQueue, JSON.stringify(updatedPosition));

                    saveLog("Status", "INFO", `Modified order ${orderId} for client ${AccountID}, retry ${retryCount + 1}/${this.MAX_RETRY_COUNT}`);
                    return updatedPosition;
                } else {
                    const failedPosition = {
                        ...positionData,
                        status: "Failed",
                        error: "Max retries exceeded"
                    };

                    // await this.lpushAsync(this.redisQueue, JSON.stringify(failedPosition));
                    await this.cancelOrder(orderId, AccountID, brokerUrl);

                    saveLog("Status", "WARN", `Max retries exceeded for order ${orderId}, client ${AccountID}`);
                    return failedPosition;
                }
            } else if (orderStatus.OrderStatus === "Rejected") {
                const failedPosition = {
                    ...positionData,
                    status: "Failed",
                    error: `Order rejected: ${orderStatus.CancelRejectReason || "Unknown reason"}`
                };

                await this.lpushAsync(this.redisQueue, JSON.stringify(failedPosition));

                saveLog("Status", "ERROR", `Order ${orderId} rejected for client ${AccountID}: ${orderStatus.CancelRejectReason || "Unknown reason"}`);
                return failedPosition;
            } else if (orderStatus.OrderStatus === "Cancelled") {
                if (retryCount < this.MAX_RETRY_COUNT) {
                    const freshPosition = {
                        ...positionData,
                        retryCount: retryCount + 1
                    };
                    delete freshPosition.orderId;

                    return await this.processPositionUntilCompletion(freshPosition);
                } else {
                    const failedPosition = {
                        ...positionData,
                        status: "Failed",
                        error: "Max retries exceeded after cancellation"
                    };

                    await this.lpushAsync(this.redisQueue, JSON.stringify(failedPosition));

                    saveLog("Status", "WARN", `Max retries exceeded after cancellation for client ${AccountID}`);
                    return failedPosition;
                }
            } else {
                const updatedPosition = {
                    ...positionData,
                    retryCount: retryCount + 1
                };

                await this.lpushAsync(this.redisQueue, JSON.stringify(updatedPosition));

                saveLog("Status", "INFO", `Order ${orderId} for client ${AccountID} has status: ${orderStatus.OrderStatus}, retrying later`);
                return updatedPosition;
            }
        } catch (error) {
            console.log("checkAndUpdatePositionStatus", error);

            const failedPosition = {
                ...positionData,
                status: "Failed",
                error: error.message
            };

            await this.lpushAsync(this.redisQueue, JSON.stringify(failedPosition));

            saveLog("Status", "ERROR", `Failed to check status for position: ${error.message}`);
            return failedPosition;
        }
    }

    async startProcessingLoop() {
        while (this.isRunning) {
            try {
                const queueData = await this.brpopAsync(this.redisQueue, this.REDIS_TIMEOUT);

                if (!queueData || queueData.length < 2) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }

                let positionData = JSON.parse(queueData[1]);
                if (!positionData.retryCount) positionData.retryCount = 0
                saveLog("Process", "INFO", `Processing position for client ${positionData.AccountID}, status: ${positionData.status || "New"}`);

                if (!positionData.status || positionData.status === "New") {
                    await this.processPositionUntilCompletion(positionData);
                } else if (positionData.status === "Pending") {
                    await this.checkAndUpdatePositionStatus(positionData);
                }
                else if (positionData.status === "Failed") {
                    let retryCount = positionData.retryCount;
                    if (retryCount < this.MAX_RETRY_COUNT) {
                        const resetPosition = {
                            ...positionData,
                            status: "New",
                            retryCount: retryCount + 1
                        };
                        delete resetPosition.orderId;
                        delete resetPosition.error;
                        await this.lpushAsync(this.redisQueue, JSON.stringify(resetPosition));

                        saveLog("Retry", "INFO", `Retrying failed position for client ${positionData.AccountID}, attempt ${retryCount + 1}/${this.MAX_RETRY_COUNT}`);
                    } else {
                        await this.lpushAsync(this.processedQueue, JSON.stringify(positionData));
                        saveLog("Retry", "WARN", `Max retries exceeded for failed position, client ${positionData.AccountID}`);
                    }
                }
                else if (positionData.status === "Completed") {
                    await this.lpushAsync(this.processedQueue, JSON.stringify(positionData));
                    saveLog("Process", "INFO", `Position already completed for client ${positionData.AccountID}, moving to processed queue`);
                }

                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                saveLog("Service", "ERROR", `Error in processing loop: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }

    async start() {
        try {
            if (this.isRunning) {
                saveLog("SqoffService", "WARN", "Service is already running");
                return;
            }

            await this.initialize();
            this.isRunning = true;
            console.log("SQUARE-OFF Service Started");
            
            saveLog("SqoffService", "INFO", "Starting square-off service");
            await this.startProcessingLoop();
        } catch (error) {
            saveLog("SqoffService", "ERROR", `Critical error in square-off service: ${error.message}`);
            this.isRunning = false;
            setTimeout(() => this.start(), 10000);
        }
    }

    async stop() {
        this.isRunning = false;
        saveLog("SqoffService", "INFO", "Stopping square-off service");
        if (this.redisClient) {
            await this.redisClient.quit();
        }
    }
}

const squareOffService = new SquareOffService();

export default function startSqoffService() {
    squareOffService.start().catch(err => {
        console.error("Square-off service failed:", err);
        process.exit(1);
    });
}

startSqoffService();

process.on('SIGTERM', async () => {
    await squareOffService.stop();
    process.exit(0);
});

process.on('SIGINT', async () => {
    await squareOffService.stop();
    process.exit(0);
});