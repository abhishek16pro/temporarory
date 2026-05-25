import StgLog from "../../models/stgLog.js";
import StrategySchema from "../../models/strategy.js";
import StgTag from "../../models/tag.js";
import redisConnect from "../../utils/redisConnect.js";
import { buildLtpMap, collectOpenTokens } from "../helpers/ltp.js";
import { computeLogPnl } from "../helpers/pnl.js";
import { handleBreachAndSquareOff } from "../helpers/autoSquareOff.js";

const client = redisConnect();

const emptyResponse = (tag) => ({
  tag,
  totalPnl: "0.00",
  strategies: [],
  timestamp: new Date().toISOString(),
});

export async function getLiveLogsByTag(tag) {
  try {
    const tagDetails = await StgTag.findOne({ tag });
    if (!tagDetails) return emptyResponse(tag);

    const currDayinNum = new Date().getDay();
    const tagWiseStgs = await StrategySchema.find({
      tag,
      parentAcc: tagDetails.tagParentAccount,
      runOnDay: { $in: [currDayinNum] },
    });

    if (!tagWiseStgs || tagWiseStgs.length === 0) return emptyResponse(tag);

    const stgNames = tagWiseStgs.map((stg) => stg.name);
    const validStrategyNames = new Set(stgNames);
    const stgTagMap = {};
    tagWiseStgs.forEach((stg) => { stgTagMap[stg.name] = stg.tag; });

    const allStgLogs = await StgLog.find({
      name: { $in: stgNames },
      clientId: tagDetails.tagParentAccount,
    });

    const logsByStrategy = {};
    for (const log of allStgLogs) {
      if (!validStrategyNames.has(log.name) || log.entryLtp === 0) continue;
      if (stgTagMap[log.name] !== tag) continue;
      if (log.clientId !== tagDetails.tagParentAccount) continue;

      if (!logsByStrategy[log.name]) logsByStrategy[log.name] = [];
      logsByStrategy[log.name].push(log);
    }

    const tokens = collectOpenTokens(allStgLogs);
    const ltpMap = await buildLtpMap(client, tokens);

    let totalPnl = 0;
    const strategyPnl = [];

    for (const stg of tagWiseStgs) {
      const stgLogs = logsByStrategy[stg.name] || [];
      let strategyTotalPnl = 0;
      for (const log of stgLogs) {
        const { pnl, lotSize } = computeLogPnl(log, ltpMap);
        if (!lotSize) continue;
        strategyTotalPnl += pnl;
      }
      strategyPnl.push({ name: stg.name, pnl: strategyTotalPnl.toFixed(2) });
      totalPnl += strategyTotalPnl;
    }

    const adjustedTotalPnl = totalPnl;
    const maxLoss = tagDetails.tagMaxLoss || 0;
    const maxProfit = tagDetails.tagMaxProfit || 0;
    const maxLossWaitSeconds = tagDetails.maxLossWaitSeconds || 0;
    const maxProfitWaitSeconds = tagDetails.maxProfitWaitSeconds || 0;

    await handleBreachAndSquareOff(
      tag,
      adjustedTotalPnl,
      maxLoss,
      maxProfit,
      maxLossWaitSeconds,
      maxProfitWaitSeconds,
    );

    return {
      tag,
      totalPnl: totalPnl.toFixed(2),
      adjustedTotalPnl: adjustedTotalPnl.toFixed(2),
      strategies: strategyPnl,
      timestamp: new Date().toISOString(),
      limits: {
        maxLoss,
        maxProfit,
        parentMultiplier: 1,
      },
    };
  } catch (error) {
    console.error("Error fetching tag live logs:", error.message);
    return {
      tag,
      totalPnl: "0.00",
      adjustedTotalPnl: "0.00",
      strategies: [],
      timestamp: new Date().toISOString(),
      limits: { maxLoss: 0, maxProfit: 0, parentMultiplier: 1 },
    };
  }
}
