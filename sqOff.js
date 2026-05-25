import { axiosFetch, getAuthToken } from "./utils/index.js";
import { Redis } from "ioredis";
import axios from "axios";
// const client = new Redis({
//       password: process.env.redisPass,
//       host: process.env.redisHost,
//       port: process.env.redisPort,
// });
import redisConnect from "./utils/redisConnect.js";
import connectDB from "./utils/connectMongo.js";
import { saveLog } from "../shared/utils/saveLogs.js";
import getAllClients from "./utils/getAllClients.js";
import dotenv from "dotenv";
dotenv.config();
import { promisify } from "util";
// import { sqOffByClientCode } from "./controllers/strategy.js";
/*
const isDev = process.argv.includes("--dev");
const MONGO_URI = isDev
    ? `mongodb://localhost:27017/XTS`
    : `mongodb://3.109.147.195:27017/XTS`;

connectDB(MONGO_URI);
*/

connectDB();
console.log("SQOFF");



const client = redisConnect();
const lpushAsync = promisify(client.lpush).bind(client);

const config = {
      headers: {
            Authorization: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySUQiOiI1MDAzXzU5MEJCM0JDOTI1RjhFRjI0MUExNzAiLCJwdWJsaWNLZXkiOiI1OTBiYjNiYzkyNWY4ZWYyNDFhMTcwIiwiaXNJbnRlcmFjdGl2ZSI6dHJ1ZSwiaWF0IjoxNzQ3Nzk3MzEzLCJleHAiOjE3NDc4ODM3MTN9.CP0KVvmWtLTSYnImRtJ9QctH7BIJbZHONra2YNH7yKA",
            "Content-Type": "application/json",
      },
};
const url = `${process.env.BASE_URL}/interactive/orders`;
const Positions = "Positions";

const getAuthTokenByClientId = async (clientId) => {
      const redisMap = "auth";
      const token = await client.hget(redisMap, "GSIHO18");
      return token;
};
async function getPriceByExchangeInstrumentId(ExchangeInstrumentId) {
      console.log("ExchangeInstrumentId::", ExchangeInstrumentId);

      const data = await client.get(String(ExchangeInstrumentId));
      // console.log("Data::", data);
      return JSON.parse(data).LTP_Rate;
}
const orderBody = {
      // exchangeSegment: "",
      productType: "NRML",
      // orderType: "",
      timeInForce: "DAY",
      disclosedQuantity: 0,
      clientId : "*****"
};

const getPosition = async (clientId) => {
      try {
            config.headers.Authorization =
                  await getAuthTokenByClientId(clientId);
            console.log("Config::", config);
            
            const url = `${process.env.BASE_URL}/interactive/portfolio/dealerpositions?dayOrNet=NetWise&clientID=${clientId}`;
            const data = await axios.get(url, config);
            const positionList = data?.data?.result?.positionList || [];
            console.log("PositionList::", positionList);

            const sqoffData = [];
            positionList.forEach((position) => {
                  const {
                        AccountID,
                        ExchangeInstrumentId,
                        Quantity,
                        NetAmount,
                        ExchangeSegment,
                  } = position;

                  if (Number(Quantity) !== 0) {
                        sqoffData.push({
                              AccountID,
                              ExchangeInstrumentId,
                              exchangeSegment: ExchangeSegment,
                              Quantity: Number(Quantity),
                              NetAmount: Number(NetAmount),
                        });
                  }
            });

            console.log("SqoffData::", sqoffData);

            if (sqoffData.length > 0) {
                  await lpushAsync("SqoffData", JSON.stringify(sqoffData));
                  console.log(
                        `Pushed ${sqoffData.length} positions to Redis for clientId: ${clientId}`,
                  );
            } else {
                  console.log("No valid data to push to Redis.");
            }
      } catch (error) {
            console.error("Error fetching positions:", error.message || error);
      }
};

const clearOrderBook = async (clientId) => {
      config.headers.Authorization = await getAuthTokenByClientId(clientId);
      const body = {
            exchangeSegment: "NESFO",
            exchangeInstrumentID: 0,
      };
      const url = `${process.env.BASE_URL}/interactive/orders/cancelall`;
      const data = await axios.post(url, body, config);
      console.log(data.data.result.status);
};

export const placeOrder = async (sqoffData) => {
      const promises = [];
      // const data = await client.get(String(sqoffData.ExchangeInstrumentId));
      console.log("IN PLACE ORDER::", sqoffData);

      const atp = await getPriceByExchangeInstrumentId(
            sqoffData.ExchangeInstrumentId,
      );
      const buyorsell = sqoffData.Quantity < 0 ? "B" : "S";
      let down_buffer = DOWN_ltp(atp, 9);
      let up_buffer = UP_ltp(atp, 9);

      const requestBody = {
            ...orderBody,
            exchangeSegment: sqoffData.exchangeSegment,
            orderType: sqoffData.exchangeSegment === "BSEFO" ? "LIMIT" : "STOPLIMIT",
            orderSide: sqoffData.Quantity > 0 ? "SELL" : "BUY",
            exchangeInstrumentID: sqoffData.ExchangeInstrumentId,
            orderQuantity: Math.abs(sqoffData.Quantity),
            limitPrice: buyorsell === "S" ? down_buffer : up_buffer,
            stopPrice: buyorsell === "S" ? up_buffer : down_buffer,
      };
      try {
            config.headers.Authorization = await getAuthTokenByClientId(
                  sqoffData.AccountID,
            );
            const { success, statusCode, message, data } = await axiosFetch(
                  url,
                  "POST",
                  config,
                  requestBody,
            );
            let orderId = data?.AppOrderID;
            let orderStatus = await checkOrderStatus(orderId);
            console.log("orderStatus", orderStatus.OrderStatus);
            saveLog(
                  "SquareOff",
                  "ORDER",
                  `${message}, ${orderId}, ${statusCode}`,
            );
            if (
                  orderStatus.OrderStatus === "New" ||
                  orderStatus.OrderStatus === "Pending New"
            ) {
                  await cancelOrder(orderId, sqoffData.AccountID);
            }
            console.log("Result::", success, statusCode, message, orderId);
            if (success) {
                  saveLog(
                        "SquareOff",
                        "SQUAREOFF ORDER",
                        `${message}, ${orderId}, ${statusCode}`,
                  );
                  promises.push(orderManagement(orderId, requestBody));
            } else {
                  saveLog(
                        "SquareOff",
                        "ERROR",
                        `${message}, ${orderId}, ${statusCode}`,
                  );
                  promises.push(placeRejectedOrder(requestBody, orderId));
            }
            const results = await Promise.allSettled(promises);
            console.log(results);
      } catch (error) {
            console.log(error);
            saveLog("SquareOff", "ERROR", `${error.message} in placing order`);
      }
};

async function orderManagement(orderId, requestBody) {
      let orderObj;
      for (let i = 0; i < 10; i++) {
            try {
                  await new Promise((resolve) => setTimeout(resolve, 1000));
                  console.log("Starting again....", orderId);
                  orderObj = await checkOrderStatus(orderId);
                  console.log("orderObj", orderObj);
                  const { OrderStatus } = orderObj;
                  if (orderObj?.OrderStatus === "Filled") {
                        client.lpush(Positions, JSON.stringify(orderObj));

                        saveLog(
                              "SqaureOff OrderManagement",
                              "TRADED/FILLED",
                              `OrderManagement for ${orderId}`,
                        );
                        return { orderId, OrderStatus };
                  } else if (orderObj?.OrderStatus === "Pending New") {
                        console.log("PENDING NEW");
                        await modifyOrder(orderObj);
                        saveLog(
                              "SqaureOff OrderManagement",
                              "PENDING NEW",
                              `OrderManagement for ${orderId}`,
                        );
                  } else if (orderObj?.OrderStatus === "New") {
                        console.log("NEW");
                        await modifyOrder(orderObj);
                        saveLog(
                              "SqaureOff OrderManagement",
                              "New",
                              `OrderManagement for ${orderId}`,
                        );
                  } else if (orderObj?.OrderStatus === "Partial") {
                        console.log("PARTIAL");
                        await modifyPartialOrder(orderObj);
                        saveLog(
                              "SqaureOff OrderManagement",
                              "PARTIAL",
                              `OrderManagement for ${orderId}`,
                        );
                  } else if (orderObj?.OrderStatus === "Rejected") {
                        console.log("REJECTED");
                        if (
                              orderObj.CancelRejectReason.includes(
                                    "Margin Shortfall",
                              )
                        ) {
                              saveLog(
                                    "SqaureOff OrderManagement",
                                    "ERROR",
                                    orderObj.CancelRejectReason,
                              );
                              return;
                        } else {
                              saveLog(
                                    "SqaureOff OrderManagement",
                                    "ERROR",
                                    `${orderId} Rejected going to Place again `,
                              );
                              orderId = await placeErrorOrder(requestBody, 9);
                              console.log("New OrderId::", orderId);

                              saveLog(
                                    "SqaureOff OrderManagement",
                                    "ORDER",
                                    `OrderManagement for ${orderId}`,
                              );
                        }
                  }
            } catch (error) {
                  console.error("Error fetching data:", error);
                  saveLog(
                        "SqaureOff OrderManagement",
                        "ERROR",
                        `${error.message} in orderManagement`,
                  );
            }
      }
      console.log("Going Out");
      return orderObj;
}

const modifyOrder = async (orderObj) => {
      try {
            // let res = await client.get(orderObj.ExchangeInstrumentID);
            // console.log(res);
            let atp = await getPriceByExchangeInstrumentId(
                  orderObj.ExchangeInstrumentID,
            );

            let down_buffer = DOWN_ltp(atp, 5);
            let up_buffer = UP_ltp(atp, 5);

            let requestBody = {
                  appOrderID: orderObj.AppOrderID,
                  modifiedProductType: orderObj.ProductType,
                  modifiedOrderType:
                        orderObj.OrderType === "StopLimit"
                              ? "StopLimit"
                              : "Limit",
                  modifiedOrderQuantity: parseInt(orderObj.OrderQuantity),
                  modifiedDisclosedQuantity: 0,
                  modifiedLimitPrice:
                        orderObj.OrderSide === "SELL" ? down_buffer : up_buffer,
                  modifiedStopPrice:
                        orderObj.OrderSide === "SELL" ? up_buffer : down_buffer,
                  modifiedTimeInForce: "DAY",
            };

            console.log("Modify Order body", requestBody);

            let { data } = await axiosFetch(url, "PUT", config, requestBody);
            // console.log(data);
            return data;
      } catch (error) {
            console.log(error);
            saveLog("modifyOrder", "ERROR", `${error.message} in modifyOrder`);
      }
};

export const modifyPartialOrder = async (orderObj) => {
      try {
            // let res = await client.get(orderObj.ExchangeInstrumentID);
            // console.log(res);
            // let atp = res.Ltp;
            let atp = await getPriceByExchangeInstrumentId(
                  orderObj.ExchangeInstrumentID,
            );

            let down_buffer = DOWN_ltp(atp, 5);
            let up_buffer = UP_ltp(atp, 5);

            let requestBody = {
                  appOrderID: orderObj.AppOrderID,
                  modifiedProductType: orderObj.ProductType,
                  modifiedOrderType:
                        orderObj.OrderType === "Stop Loss"
                              ? "STOPLOSS"
                              : "LIMIT",
                  modifiedOrderQuantity: parseInt(orderObj.OrderQuantity),
                  modifiedDisclosedQuantity: 0,
                  modifiedLimitPrice:
                        orderObj.OrderSide === "SELL" ? down_buffer : up_buffer,
                  modifiedStopPrice:
                        orderObj.OrderSide === "SELL" ? up_buffer : down_buffer,
                  modifiedTimeInForce: "DAY",
            };

            console.log("Modify Order body", requestBody);

            let { data } = await axiosFetch(url, "PUT", config, requestBody);
            console.log(data);
            return data;
      } catch (error) {
            console.log(error);
            saveLog(
                  "ModifyPartialOrder",
                  "ERROR",
                  `${error.message} in ModifyPartialOrder`,
            );
      }
};

export const placeRejectedOrder = async (requestBody, orderId) => {
      try {
            let { data } = await axiosFetch(url, "PUT", config, requestBody);
            if (data.AppOrderID) {
                  return data;
            }
      } catch (error) {
            console.log(error);
            saveLog(
                  "placeRejectedOrder",
                  "ERROR",
                  `${error.message} in placeRejectedOrder`,
            );
      }
};

export const placeErrorOrder = async (requestBody, entryBuffer) => {
      try {
            // console.log(requestBody);

            // let atp = await client.get(reqBody.ExchangeInstrumentID);

            // atp = JSON.parse(atp);
            // atp = atp.LTP_Rate;
            let atp = await getPriceByExchangeInstrumentId(
                  requestBody.ExchangeInstrumentID,
            );

            let down_buffer = DOWN_ltp(atp, 5);
            let up_buffer = UP_ltp(atp, 5);

            // console.log(res.Ltp, down_buffer, up_buffer);

            if (requestBody.buyorsell === "SELL") {
                  requestBody.price = down_buffer;
                  requestBody.triggerprice = up_buffer;
            } else {
                  requestBody.price = up_buffer;
                  requestBody.triggerprice = down_buffer;
            }

            const { success, statusCode, message, data } = await axiosFetch(
                  url,
                  "POST",
                  config,
                  requestBody
            );
            let orderId = data?.AppOrderID;
            console.log("Result::", success, statusCode, message, orderId);
            return orderId; //Previously it is sending status also  { status, uniqueorderid }
      } catch (error) {
            console.log(error);
            saveLog(
                  "placeErrorOrder",
                  "ERROR",
                  `${error.message} in placeErrorOrder`,
            );
      }
};

const checkOrderStatus = async (uniqueOrderId) => {
      const orderStatusUrl = `${url}?appOrderID=${uniqueOrderId}`;
      try {
            const { success, statusCode, message, data } = await axiosFetch(
                  orderStatusUrl,
                  "GET",
                  config,
            );

            const orderStatusObj = data[data.length - 1];
            console.log("OrderStatusObj::", orderStatusObj);
            
            return orderStatusObj;
      } catch (error) {
            console.log(error, "in error");
      }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sqoff(clientId) {
      try {
            const MAXORDERLIMITPERLOT = 10;
            const SLEEP_TIME = 1000;
            let clients = [];

            if (clientId) {
                  clients.push(clientId);
            } else {
                  clients = await getAllClients();
            }
            for (let i = 0; i < clients.length; i++) {
                  await getPosition(clients[i].userId);

                  const redisList = "SqoffData";
                  let processing = true;
                  while (processing) {
                        const sqoffData = await client.brpop(redisList, 0);
                        const parsedSqoffData = JSON.parse(sqoffData[1]);

                        for (let j = 0; j < parsedSqoffData.length; j++) {
                              await clearOrderBookByClient(
                                    parsedSqoffData[j].AccountID,
                              );
                              await placeOrder(parsedSqoffData[j]);

                              // const batch = parsedSqoffData.slice(j, j + MAXORDERLIMITPERLOT);
                              // console.log("Batch::", batch);

                              // const promises = batch.map((order) => placeOrder(order));

                              // await Promise.allSettled(promises);

                              // console.log(
                              //       `Placed ${batch.length} orders. Waiting for 5 seconds...`,
                              // );
                              // await sleep(SLEEP_TIME);
                        }
                  }
            }
      } catch (error) {
            console.log(error);
            // return new LogMsgForApiResponse(false, null, `Error in sqoff trading: ${error.message}`);
      }
}

function DOWN_ltp(ltp, buffer) {
      let DOWN_ltp = ltp * (1 - Math.abs(buffer / 100));
      DOWN_ltp = Math.round(DOWN_ltp * 20) / 20;
      return DOWN_ltp;
}
function UP_ltp(ltp, buffer) {
      let UP_ltp = ltp * (1 + Math.abs(buffer / 100));
      UP_ltp = Math.round(UP_ltp * 20) / 20;
      return UP_ltp;
}

async function saveMtm(orderData, clientId) {
      const mtm = orderData.reduce((acc, curr) => {
            return acc + curr.NetAmount;
      }, 0);
      const mtmData = {
            clientId,
            mtm,
      };
      await lpushAsync("MTM", JSON.stringify(mtmData));
}

const getAggregatedPositions = async (clientId) => {
      try {
            config.headers.Authorization =
                  await getAuthTokenByClientId(clientId);

            const url = `${process.env.BASE_URL}/interactive/portfolio/positions?dayOrNet=DayWise`;

            const data = await axios.get(url, config);

            const positionList = data?.data?.result?.positionList || [];
            console.log("PositionList::", positionList);

            const aggregatedData = {};

            positionList.forEach((position) => {
                  const {
                        AccountID,
                        ExchangeInstrumentId,
                        Quantity,
                        NetAmount,
                  } = position;

                  if (Number(Quantity) !== 0) {
                        if (!aggregatedData[ExchangeInstrumentId]) {
                              aggregatedData[ExchangeInstrumentId] = {
                                    AccountID,
                                    ExchangeInstrumentId,
                                    Quantity: 0,
                                    NetAmount: 0,
                              };
                        }

                        aggregatedData[ExchangeInstrumentId].Quantity +=
                              Number(Quantity);
                        aggregatedData[ExchangeInstrumentId].NetAmount +=
                              Number(NetAmount);
                  }
            });

            const sqoffData = Object.values(aggregatedData);

            console.log("SqoffData::", sqoffData);

            if (sqoffData.length > 0) {
                  await lpushAsync("SqoffData", JSON.stringify(sqoffData));
                  console.log(
                        `Pushed ${sqoffData.length} positions to Redis for clientId: ${clientId}`,
                  );
            } else {
                  console.log("No valid data to push to Redis.");
            }
      } catch (error) {
            console.error("Error fetching positions:", error.message || error);
      }
};

async function cancelOrder(appOrderID, clientId) {
      try {
            console.log("Cancelling order:", appOrderID);

            const url = `${process.env.BASE_URL}/interactive/orders?appOrderID=${appOrderID}&clientID=${clientId}`;

            const response = await axios.delete(url, {
                  headers: {
                        Authorization: await getAuthTokenByClientId(clientId),
                        "Content-Type": "application/json",
                  },
            });
            console.log("Order Cancelled:", response.data);

            return response;
      } catch (error) {
            console.error("Error cancelling order:", error.message || error);
      }
}

async function clearOrderBookByClient(clientId) {
      try {
            config.headers.Authorization =
                  await getAuthTokenByClientId(clientId);
            const reqUrl = `http://150.129.144.106:3000/interactive/orders`;
            console.log("reqUrl::", config);
            
            const respData = await axios.get(reqUrl, config);

            const ordersList = respData.data;
            console.log("OrdersList::", ordersList);
            
            if (!ordersList || typeof ordersList !== "object") {
                  console.error("Invalid ordersList format:", ordersList);
                  return;
            }

            for (const key of Object.keys(ordersList)) {
                  const orderArray = ordersList[key];

                  if (!Array.isArray(orderArray)) {
                        console.warn(
                              `Invalid order array for key ${key}:`,
                              orderArray,
                        );
                        continue;
                  }

                  for (const order of orderArray) {
                        const orderStatus = order.OrderStatus;
                        if (
                              orderStatus === "New" ||
                              orderStatus === "Pending New"
                        ) {
                              const appOrderID = order.AppOrderID;
                              console.log("Cancelling order:", appOrderID);
                              saveLog("SQOFF", "CANCEL", `Cancelling order: ${appOrderID}`);
                              if (appOrderID) {
                                    await cancelOrder(appOrderID, clientId);
                              } else {
                                    console.warn(`No Open Positions Available`);
                              }
                        } else {
                              console.warn(
                                    `Order ${order.AppOrderID} is not in New or Pending New state:`,
                                    orderStatus,
                              );
                        }
                  }
            }
      } catch (error) {
            console.error("Error clearing order book:", error.message);
      }
}

// clearOrderBookByClient("PRO3")

// async function placeAllOrders() {
//       const clientIds = await getAllClients();
//       for (const client of clientIds) {
//             console.log("Client:",client.userId);
//             await sqoff(client);
//             sleep(1000);
//       }
// }
// export sqoff as api with params clientId
const SqoffByClientId = async (clientId) => {
      try {
        const clientList = clientId
          ? [String(clientId)]
          : (await getAllClients()).map(({ userId }) => userId); 
      
        console.log("Processing clients:", clientList);

        await Promise.all(
          clientList.map(async (client) => {
            try {
              await getPosition(client); 
              await sqoff(client); 
            } catch (err) {
              console.error(`Error processing client ${client}:`, err);
            }
          })
        );
    
      let msg = `SQOFF trading Started for ${clientList.length} clients.`;
      console.log(msg);
      // return msg;        
      } catch (error) {
        console.error("An error occurred while processing clients:", error);
      }
    };

// getAggregatedPositions("HEENA279");
// getPosition("PRO18")
// checkOrderStatus("1211063256")

export default SqoffByClientId;
