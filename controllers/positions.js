import ApiResponse from "../../shared/utils/apiResponse.js";
import account from "../models/account.js";
import positions from "../models/position.js";
import { axiosFetch, getAuthToken } from "../utils/index.js";
import processPositions from "../utils/processTrades.js";
import redisConnect from "../utils/redisConnect.js";
import { saveLog } from "../../shared/utils/saveLogs.js";

const redisClient = redisConnect()
export const getPositions = async (req, res) => {
  try {
    // Fetch the latest positions initially
    const latestPositions = await getClientPositions();
    // console.log(latestPositions);

    // Send the initial positions to the requesting client
    return res.send(
      new ApiResponse({
        success: true,
        statusCode: 200,
        message: "Positions fetched successfully",
        data: latestPositions,
      }).toObject(),
    );

  } catch (error) {
    console.error("Error in getting Positions:", error.message || error);
    return res.send(
      new ApiResponse({
        success: false,
        statusCode: 500,
        message: error.message,
      }).toObject(),
    );
  }
};

export const getClientPositions = async () => {
  let positions = [];
  try {
    const clientIds = await account.find(
      {
        active: true,
        userId: { $not: /^SIM/i }
      },
      {
        userId: 1,
        firstName: 1,
        _id: 1,
        mapped: 1,
        active: 1,
        parent: 1,
        brokerUrl: 1,
        isIndividualClient: 1
      }
    );

    const clientPromises = clientIds.map(async (clientId) => {
      try {
        let clientObj = {}
        let totalBuyQuantity = 0;
        let totalSellQuantity = 0;
        let netQuantity = 0;
        const latestPositions = await fetchAndSavePositions(clientId.userId, clientId.brokerUrl, clientId.isIndividualClient);
        let mtm = 0

        if (latestPositions.length > 0) {
          const instrumentIds = latestPositions
            .filter(position => position.quantity != 0)
            .map(position => position.exchangeInstrumentId);

          const redisData = {};
          if (instrumentIds.length > 0) {
            const redisResults = await redisClient.mget(...instrumentIds);
            instrumentIds.forEach((id, index) => {
              redisData[id] = redisResults[index];
            });
          }

          for (const position of latestPositions) {
            totalBuyQuantity += parseFloat(position.openBuyQuantity);
            totalSellQuantity += parseFloat(position.openSellQuantity);
            netQuantity += parseFloat(position.quantity);

            let posPnl = 0;
            let ltp = 0;

            if (position.quantity != 0) {
              const webSocketData = redisData[position.exchangeInstrumentId];
              if (webSocketData) {
                let wbJson = JSON.parse(webSocketData);
                ltp = wbJson.LTP_Rate;
                posPnl = parseFloat(position.sellAmount) - parseFloat(position.buyAmount) + parseFloat(position.quantity) * ltp;
                mtm += posPnl;
              }
            } else {
              posPnl = parseFloat(position.sellAmount) - parseFloat(position.buyAmount);
              mtm += posPnl;
            }

            position.pnl = posPnl;
            position.ltp = ltp;
          }
        } else {
          console.log("No Positions in: ", clientId);
        }

        clientObj.clientId = clientId;
        clientObj.mtm = mtm;
        clientObj.positions = latestPositions;
        clientObj.totalBuyQuantity = totalBuyQuantity;
        clientObj.totalSellQuantity = totalSellQuantity;
        clientObj.netQuantity = netQuantity;
        return clientObj;
      } catch (error) {
        console.error(`Error fetching positions for client ${clientId.userId}:`, error.message);
        return null;
      }
    });
    const results = await Promise.all(clientPromises);
    positions = results.filter(result => result !== null);

    return positions;
  } catch (error) {
    console.error("Error fetching client positions:", error);
  }
}

export const fetchAndSavePositions = async (clientId, clientUrl, isIndividualClient) => {
  // console.log(clientUrl);

  try {
    const config = {
      headers: {
        Authorization: await getAuthToken(clientId),
      },
    };

    let url
    if (isIndividualClient) url = `${clientUrl}/interactive/portfolio/positions?dayOrNet=DayWise`;
    else url = `${clientUrl}/interactive/portfolio/dealerpositions?dayOrNet=NetWise&clientID=${clientId}`;

    const { data: { positionList } } = await axiosFetch(url, "GET", config);
    if (positionList.length === 0) {
      console.log("No positions found");
      return []
    }

    const formattedPositions = positionList.map((position) => {
      const formatNumber = (value) => {
        const num = Number(value);
        return isNaN(num) ? "0.00" : num.toFixed(2);
      };

      return {
        accountID: position.AccountID,
        tradingSymbol: position.TradingSymbol,
        exchangeSegment: position.ExchangeSegment,
        exchangeInstrumentId: position.ExchangeInstrumentId,
        marketlot: position.Marketlot,
        quantity: position.Quantity,
        netAmount: formatNumber(position.NetAmount),
        buyAveragePrice: formatNumber(position.BuyAveragePrice),
        sellAveragePrice: formatNumber(position.SellAveragePrice),
        buyAmount: formatNumber(position.BuyAmount),
        sellAmount: formatNumber(position.SellAmount),
        openBuyQuantity: formatNumber(position.OpenBuyQuantity),
        openSellQuantity: formatNumber(position.OpenSellQuantity),
      };
    });

    console.log(`Sent ${formattedPositions.length} positions for clientId: ${clientId}`);
    return formattedPositions;
  } catch (error) {
    console.error("Error fetching or saving positions:", error.message);
    throw error;
  }
};

export const getPendingOrders = async (req, res) => {
  try {
    const pendingOrders = await getClientPendingOrders();

    return res.send(
      new ApiResponse({
        success: true,
        statusCode: 200,
        message: "Pending orders fetched successfully",
        data: pendingOrders,
      }).toObject(),
    );

  } catch (error) {
    console.error("Error in getting pending orders:", error.message || error);
    return res.send(
      new ApiResponse({
        success: false,
        statusCode: 500,
        message: error.message,
      }).toObject(),
    );
  }
};

export const getClientPendingOrders = async () => {
  let allPendingOrders = [];
  try {
    const clientIds = await account.find(
      {
        active: true,
        userId: { $not: /^SIM/i } // Skip clients whose userId starts with SIM
      },
      {
        userId: 1,
        firstName: 1,
        _id: 1,
        mapped: 1,
        active: 1,
        parent: 1,
        brokerUrl: 1,
        isIndividualClient: 1
      }
    );

    const clientPromises = clientIds.map(async (clientId) => {
      try {
        const pendingOrders = await fetchPendingOrders(clientId.userId, clientId.brokerUrl, clientId.isIndividualClient);

        if (pendingOrders.length > 0) {
          return pendingOrders.map(order => ({
            ...order,
            clientInfo: {
              userId: clientId.userId,
              firstName: clientId.firstName,
              _id: clientId._id
            }
          }));
        }
        return [];
      } catch (error) {
        console.error(`Error fetching pending orders for client ${clientId.userId}:`, error.message);
        return [];
      }
    });
    const results = await Promise.all(clientPromises);
    allPendingOrders = results.flat();

    return allPendingOrders;
  } catch (error) {
    console.error("Error fetching client pending orders:", error);
    throw error;
  }
};

export const fetchPendingOrders = async (clientId, clientUrl, isIndividualClient) => {
  try {
    const config = {
      headers: {
        Authorization: await getAuthToken(clientId),
      },
    };

    let url
    if (isIndividualClient) url = `${clientUrl}/interactive/orders`;
    else url = `${clientUrl}/interactive/orders/dealerorderbook?clientID=${clientId}`;

    const response = await axiosFetch(url, "GET", config);

    const result = response.data;

    if (!result || result.length === 0) {
      console.log("No orders found for client:", clientId);
      return [];
    }

    console.log(`Found ${result.length} orders for clientId: ${clientId}`);
    return result;
  } catch (error) {
    console.error("Error fetching orders:", error.message);
    throw error;
  }
};


export const getPendingOrdersByClient = async (req, res) => {
  try {
    let clientWiseOrders = [];
    const clientIds = await account.find(
      {
        active: true,
        userId: { $not: /^SIM/i } // Skip clients whose userId starts with SIM
      },
      {
        userId: 1,
        firstName: 1,
        _id: 1,
        mapped: 1,
        active: 1,
        parent: 1,
        brokerUrl: 1
      }
    );

    const clientPromises = clientIds.map(async (clientId) => {
      try {
        const pendingOrders = await fetchPendingOrders(clientId.userId, clientId.brokerUrl);

        if (pendingOrders.length > 0) {
          return {
            clientInfo: {
              userId: clientId.userId,
              firstName: clientId.firstName,
              _id: clientId._id
            },
            pendingOrders: pendingOrders
          };
        }
        return null;
      } catch (error) {
        console.error(`Error fetching pending orders for client ${clientId.userId}:`, error.message);
        return null;
      }
    });

    // Wait for all client promises to resolve
    const results = await Promise.all(clientPromises);

    // Filter out any null results (clients with no pending orders)
    clientWiseOrders = results.filter(result => result !== null);

    return res.send(
      new ApiResponse({
        success: true,
        statusCode: 200,
        message: "Client-wise pending orders fetched successfully",
        data: clientWiseOrders,
      }).toObject(),
    );

  } catch (error) {
    console.error("Error in getting client-wise pending orders:", error.message || error);
    return res.send(
      new ApiResponse({
        success: false,
        statusCode: 500,
        message: error.message,
      }).toObject(),
    );
  }
};

