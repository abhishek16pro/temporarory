import redisConnect from "./redisConnect.js";
import { saveLog } from "../../shared/utils/saveLogs.js";

const client = redisConnect()
const processPositions = async(trades) => {
  let mtm = 0;
  let totalBuyQuantity = 0;
  let totalSellQuantity = 0;
  let netQuantity = 0;
  let includeMTM = true;
  let totalNetAmount = 0
  let totalSellAmount = 0
  let totalBuyAmount = 0
  for (const trade of trades) {
    // console.log("trade",trade);
    const buyAvgPrice = parseFloat(trade.buyAveragePrice || 0);
    const sellAvgPrice = parseFloat(trade.sellAveragePrice || 0);
    const netAmount = parseFloat(trade.netAmount || 0);
    const marketlot = parseInt(trade.marketlot || 0);
    const quantity = parseInt(trade.quantity || 0);
    const openBuyQuantity = parseInt(trade.openBuyQuantity || 0);
    const openSellQuantity = parseInt(trade.openSellQuantity || 0);
    const buyAmount = parseInt(trade.buyAmount || 0);
    const sellAmount = parseInt(trade.sellAmount || 0);
    try {
      const webSocketData = await client.get(trade.exchangeInstrumentId);
      if (!webSocketData) {
        throw new Error(`No data found in Redis for exchangeInstrumentId: ${trade.exchangeInstrumentId}`);
      }
      const wbJson = JSON.parse(webSocketData);
      const LTP_Rate = parseFloat(wbJson.LTP_Rate);
      // console.log( wbJson.LTP_Rate);
      
      // mtm += trade.quantity === 0 
      //   ? parseFloat(trade.netAmount || 0) 
      //   : trade.buyAveragePrice > 0 
      //   ? (wbJson.LTP_Rate - trade.buyAveragePrice) * trade.marketlot
      //   : trade.sellAveragePrice > 0
      //   ? (trade.sellAveragePrice - wbJson.LTP_Rate) * trade.marketlot
      //   : 0
      // mtm += netAmount;
      // console.log("NETAMOUNT:",netAmount);
      // console.log("MTM:",mtm);
      
      if (quantity === 0) {
        // Fully squared-off position → realized P&L
        mtm += netAmount;
        // console.log(`MTM (closed): ${netAmount}`);
      } else if (quantity > 0 && openSellQuantity === 0) {
        // Long position only
        const unrealized = (LTP_Rate - buyAvgPrice) * quantity;
        mtm += unrealized;
        // console.log(`MTM (open long): ${unrealized}`);
      } else if (quantity < 0 && openBuyQuantity === 0) {
        // Short position only
        const unrealized = (sellAvgPrice - LTP_Rate) * Math.abs(quantity);
        mtm += unrealized;
        // console.log(`MTM (open short): ${unrealized}`);
      } else if(openSellQuantity > 0 && openBuyQuantity > 0) {
        // Mixed / partially hedged
        // console.log("⚠️ Mixed position, using netAmount only");
        const realized = netAmount;
        let unrealized = 0;

        if (quantity > 0 && buyAvgPrice > 0) {
          unrealized = (LTP_Rate - buyAvgPrice) * quantity;
        } else if (quantity < 0 && sellAvgPrice > 0) {
          unrealized = (sellAvgPrice - LTP_Rate) * Math.abs(quantity);
        }
        mtm += unrealized + realized; // fallback to realized only
      }
    } catch (error) {
      saveLog("MTM Error","ERROR",`Error fetching data for trade ${trade.exchangeInstrumentId}`);
      includeMTM = false; // If any trade has an issue fetching Redis data, exclude MTM
    }
    
    totalBuyQuantity += openBuyQuantity;
    totalSellQuantity += openSellQuantity;
    netQuantity += quantity;
    // console.log({
    //   LTP_Rate,
    //   buyAvgPrice,
    //   sellAvgPrice,
    //   netAmount,
    //   marketlot,
    //   quantity,
    //   mtm,
    // });
  }

  // console.log("mtm:",mtm);
  
  
  return {
    ...(includeMTM && { mtm }),
    totalBuyQuantity,
    totalSellQuantity,
    netQuantity,
    positions: trades
  }
  
}

export default processPositions