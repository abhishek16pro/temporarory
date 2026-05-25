import StgLog from "../../models/stgLog.js";
import StrategySchema from "../../models/strategy.js";
import StgTag from "../../models/tag.js";
import redisConnect from "../../utils/redisConnect.js";
import { saveLog } from "../../../shared/utils/saveLogs.js";

const client = redisConnect();

const lotValues = {
  BANKNIFTY: process.env.BNLot,
  FINNIFTY: process.env.FNLot,
  MIDCPNIFTY: process.env.MCNLot,
  NIFTY: process.env.NFLot,
  SENSEX: process.env.SXLot,
};

async function getLiveLogsByTag(tag) {
  const tagDetails = await StgTag.findOne({ tag });
  if (!tagDetails) {
    return {
      tag,
      totalPnl: "0.00",
      strategies: [],
      timestamp: new Date().toISOString(),
    };
  }

  const currDayinNum = new Date().getDay();
  const tagWiseStgs = await StrategySchema.find({
    tag,
    parentAcc: tagDetails.tagParentAccount,
    runOnDay: { $in: [currDayinNum] },
  });

  if (!tagWiseStgs.length) {
    return {
      tag,
      totalPnl: "0.00",
      strategies: [],
      timestamp: new Date().toISOString(),
    };
  }

  const stgNames = tagWiseStgs.map((stg) => stg.name);
  const validStrategyNames = new Set(stgNames);
  const stgTagMap = {};
  tagWiseStgs.forEach((stg) => { stgTagMap[stg.name] = stg.tag; });

  const allStgLogs = await StgLog.find({ name: { $in: stgNames }, clientId: tagDetails.tagParentAccount });

  const validLogs = allStgLogs.filter((log) =>
    validStrategyNames.has(log.name) && log.entryLtp !== 0 && stgTagMap[log.name] === tag && log.clientId === tagDetails.tagParentAccount
  );

  const symbolTokens = Array.from(
    new Set(validLogs.filter((log) => log.orderStatus.toLowerCase() !== "completed").map((log) => log.symbolToken))
  );

  const ltpDataArray = await Promise.all(symbolTokens.map((token) => client.get(token)));
  const ltpDataMap = {};
  symbolTokens.forEach((token, index) => {
    const data = ltpDataArray[index];
    if (data) {
      try {
        ltpDataMap[token] = JSON.parse(data);
      } catch {
        // ignore invalid JSON
      }
    }
  });

  let totalPnl = 0;
  const strategyPnl = [];

  for (const stg of tagWiseStgs) {
    const logs = validLogs.filter((log) => log.name === stg.name);
    let strategyTotalPnl = 0;

    for (const log of logs) {
      let lot;
      for (const [indexName, lotValue] of Object.entries(lotValues)) {
        if (log.symbol.includes(indexName)) {
          lot = lotValue;
          break;
        }
      }
      if (!lot) continue;

      let pnl = 0;
      if (log.orderStatus.toLowerCase() === "completed") {
        pnl = log.side === "B"
          ? (log.exitLtp - log.entryLtp) * lot * log.lot
          : (log.entryLtp - log.exitLtp) * lot * log.lot;
      } else {
        const wbJson = ltpDataMap[log.symbolToken];
        if (wbJson) {
          pnl = log.side === "B"
            ? (wbJson.LTP_Rate - log.entryLtp) * lot * log.lot
            : (log.entryLtp - wbJson.LTP_Rate) * lot * log.lot;
        }
      }
      strategyTotalPnl += pnl;
    }

    strategyPnl.push({
      name: stg.name,
      pnl: strategyTotalPnl.toFixed(2),
    });
    totalPnl += strategyTotalPnl;
  }

  const adjustedTotalPnl = totalPnl;

  await handleBreachAndSquareOff(
    tag,
    adjustedTotalPnl,
    tagDetails.tagMaxLoss || 0,
    tagDetails.tagMaxProfit || 0,
    tagDetails.maxLossWaitSeconds || 0,
    tagDetails.maxProfitWaitSeconds || 0,
    `tag:${tag}:sqoff_done`,
  );

  return {
    tag,
    totalPnl: totalPnl.toFixed(2),
    adjustedTotalPnl: adjustedTotalPnl.toFixed(2),
    strategies: strategyPnl,
    timestamp: new Date().toISOString(),
    limits: {
      maxLoss: tagDetails.tagMaxLoss || 0,
      maxProfit: tagDetails.tagMaxProfit || 0,
      parentMultiplier: 1,
    },
  };
}

async function handleTagSquareOff(tag, adjustedTotalPnl, isLossBreach, maxLoss, maxProfit, sqoffDoneKey) {
  const lockKey = `tag:${tag}:sqoff_lock`;
  const lockResult = await client.set(lockKey, Date.now().toString(), "NX", "EX", 60);
  if (lockResult !== "OK") return;

  try {
    const runningStrategies = await StrategySchema.find({ tag, status: "Running" }, { _id: 1 });
    if (runningStrategies.length > 0) {
      const pipeline = client.pipeline();
      runningStrategies.forEach((strategy) => {
        const key = `SQOFF:${strategy._id}`;
        pipeline.set(key, JSON.stringify({ message: "STRATEGY_MANUAL_SQOFF" }));
      });
      pipeline.set(sqoffDoneKey, "1", "EX", 86400);
      await pipeline.exec();

      const breachType = isLossBreach ? "max loss" : "max profit";
      const breachValue = isLossBreach ? maxLoss : maxProfit;
      await saveLog(
        "AUTO_SQOFF",
        "MESSAGE",
        `Auto square-off triggered for tag ${tag} due to ${breachType} limit (${breachValue}) reached. Current PnL: ${adjustedTotalPnl.toFixed(2)}`,
      );
    } else {
      await client.set(sqoffDoneKey, "1", "EX", 86400);
    }

    await Promise.all([
      client.del(`tag:${tag}:breach_status`),
      client.del(`tag:${tag}:logged_wait`),
    ]);
  } catch (error) {
    console.error(`Error in auto square-off for tag ${tag}:`, error);
    await saveLog("ERROR", "AUTO_SQOFF", `Failed to auto square-off tag ${tag}: ${error.message}`);
  } finally {
    await client.del(lockKey);
  }
}

async function handleBreachAndSquareOff(tag, adjustedTotalPnl, maxLoss, maxProfit, maxLossWaitSeconds, maxProfitWaitSeconds, sqoffDoneKey) {
  const keyPrefix = `tag:${tag}:`;
  const breachStatusKey = `${keyPrefix}breach_status`;
  const loggedWaitKey = `${keyPrefix}logged_wait`;
  const sqoffDone = await client.get(sqoffDoneKey);
  if (sqoffDone) return;

  const isLossBreach = maxLoss > 0 && adjustedTotalPnl <= -maxLoss;
  const isProfitBreach = maxProfit > 0 && adjustedTotalPnl >= maxProfit;
  const isBreach = isLossBreach || isProfitBreach;
  const breachType = isLossBreach ? "loss" : isProfitBreach ? "profit" : null;
  const waitSeconds = isLossBreach ? maxLossWaitSeconds : maxProfitWaitSeconds;

  const breachStatus = await client.get(breachStatusKey);
  let parsedStatus = null;
  try {
    if (breachStatus) parsedStatus = JSON.parse(breachStatus);
  } catch {
    parsedStatus = null;
  }

  if (!isBreach) {
    if (parsedStatus) {
      await Promise.all([
        client.del(breachStatusKey),
        client.del(loggedWaitKey),
      ]);
      await saveLog("BREACH_RECOVERY", "MESSAGE", `Tag ${tag} recovered from ${parsedStatus.type} breach. Current PnL: ${adjustedTotalPnl.toFixed(2)}`);
    }
    return;
  }

  if (!parsedStatus) {
    await client.set(breachStatusKey, JSON.stringify({ type: breachType, startTime: Date.now(), waitSeconds }));
    if (waitSeconds > 0) {
      await client.set(loggedWaitKey, "1", "EX", waitSeconds + 5);
      await saveLog("AUTO_SQOFF_WAIT", "MESSAGE", `Auto square-off wait started for tag ${tag} due to ${breachType} breach. Will check again after ${waitSeconds} seconds.`);
    } else {
      await handleTagSquareOff(tag, adjustedTotalPnl, isLossBreach, maxLoss, maxProfit, sqoffDoneKey);
    }
    return;
  }

  if (parsedStatus.type !== breachType) {
    await client.set(breachStatusKey, JSON.stringify({ type: breachType, startTime: Date.now(), waitSeconds }));
    if (waitSeconds > 0) {
      await client.del(loggedWaitKey);
      await client.set(loggedWaitKey, "1", "EX", waitSeconds + 5);
      await saveLog("AUTO_SQOFF_WAIT", "MESSAGE", `Breach type changed to ${breachType} for tag ${tag}. Starting new wait period of ${waitSeconds} seconds.`);
    } else {
      await handleTagSquareOff(tag, adjustedTotalPnl, isLossBreach, maxLoss, maxProfit, sqoffDoneKey);
    }
    return;
  }

  const elapsedTime = Date.now() - parsedStatus.startTime;
  if (elapsedTime >= parsedStatus.waitSeconds * 1000) {
    if (isBreach) {
      await saveLog("AUTO_SQOFF_AFTER_WAIT", "MESSAGE", `Auto square-off triggered for tag ${tag} after ${waitSeconds} seconds wait. ${breachType} breach still persists.`);
      await handleTagSquareOff(tag, adjustedTotalPnl, isLossBreach, maxLoss, maxProfit, sqoffDoneKey);
    } else {
      await Promise.all([
        client.del(breachStatusKey),
        client.del(loggedWaitKey),
      ]);
    }
  }
}

export function registerTagPnLHandlers(socket, roomManager) {
  socket.on("subscribeTagPnL", async ({ tag }) => {
    if (!tag) return;
    const roomName = `tagPnL:${tag}`;
    socket.join(roomName);
    roomManager.schedule(roomName, 1000, () => getLiveLogsByTag(tag), "tagPnLUpdate");
    try {
      socket.emit("tagPnLUpdate", await getLiveLogsByTag(tag));
    } catch (error) {
      console.error("Failed to emit initial tag PnL data:", error);
    }
    roomManager.cleanupEmptyRoomIntervals();
  });

  socket.on("subscribeAccountWiseTagPnL", async ({ tag }) => {
    if (!tag) return;
    const roomName = `accountWiseTagPnL:${tag}`;
    socket.join(roomName);
    roomManager.schedule(roomName, 2000, async () => {
      const tagDetails = await StgTag.findOne({ tag }).lean();
      if (!tagDetails) {
        return { success: false, data: [], message: "Tag not found" };
      }
      const tagWiseStgs = await StrategySchema.find({ tag }).lean().select("name tag");
      const stgNames = tagWiseStgs.map((stg) => stg.name);
      const stgTagMap = {};
      tagWiseStgs.forEach((stg) => { stgTagMap[stg.name] = stg.tag; });
      const allStgLogs = await StgLog.find({ name: { $in: stgNames } }).lean();
      const tokens = new Set();
      allStgLogs.forEach((log) => {
        if (log.orderStatus?.toLowerCase() !== "completed") tokens.add(log.symbolToken);
      });
      const tokenArray = Array.from(tokens);
      const tokenValues = tokenArray.length ? await client.mget(tokenArray) : [];
      const ltpMap = {};
      tokenArray.forEach((t, i) => {
        const raw = tokenValues[i];
        if (raw) {
          try { ltpMap[t] = JSON.parse(raw); } catch { }
        }
      });

      const accountWisePnl = await Promise.all(
        (tagDetails.mappedAccount || []).map(async (acc) => {
          const logs = allStgLogs.filter((l) => l.clientId === acc.clientId && stgTagMap[l.name] === tag);
          let realizedPnl = 0;
          let openPnl = 0;
          for (const log of logs) {
            let lot;
            for (const [indexName, lotValue] of Object.entries(lotValues)) {
              if (log.symbol?.includes(indexName)) { lot = lotValue; break; }
            }
            if (!lot) continue;
            if (log.orderStatus?.toLowerCase() === "completed" && log.exitLtp) {
              realizedPnl += (log.side === "B"
                ? (log.exitLtp - log.entryLtp)
                : (log.entryLtp - log.exitLtp)) * lot * log.lot;
            } else {
              const wb = ltpMap[log.symbolToken];
              if (wb?.LTP_Rate != null) {
                openPnl += (log.side === "B"
                  ? (wb.LTP_Rate - log.entryLtp)
                  : (log.entryLtp - wb.LTP_Rate)) * lot * log.lot;
              }
            }
          }
          return {
            account: acc.clientId,
            realizedPnl: realizedPnl.toFixed(2),
            openPnl: openPnl.toFixed(2),
            totalPnl: (realizedPnl + openPnl).toFixed(2),
          };
        })
      );

      return { success: true, data: accountWisePnl };
    }, "accountWiseTagPnLUpdate");

    try {
      const tagDetails = await StgTag.findOne({ tag }).lean();
      if (!tagDetails) {
        socket.emit("accountWiseTagPnLUpdate", { success: false, data: [], message: "Tag not found" });
      } else {
        const tagWiseStgs = await StrategySchema.find({ tag }).lean().select("name tag");
        const stgNames = tagWiseStgs.map((stg) => stg.name);
        const stgTagMap = {};
        tagWiseStgs.forEach((stg) => { stgTagMap[stg.name] = stg.tag; });
        const allStgLogs = await StgLog.find({ name: { $in: stgNames } }).lean();
        const tokens = new Set();
        allStgLogs.forEach((log) => { if (log.orderStatus?.toLowerCase() !== "completed") tokens.add(log.symbolToken); });
        const tokenArray = Array.from(tokens);
        const tokenValues = tokenArray.length ? await client.mget(tokenArray) : [];
        const ltpMap = {};
        tokenArray.forEach((t, i) => { const raw = tokenValues[i]; if (raw) { try { ltpMap[t] = JSON.parse(raw); } catch { } } });
        const accountWisePnl = await Promise.all((tagDetails.mappedAccount || []).map(async (acc) => {
          const logs = allStgLogs.filter((l) => l.clientId === acc.clientId && stgTagMap[l.name] === tag);
          let realizedPnl = 0; let openPnl = 0;
          for (const log of logs) {
            let lot;
            for (const [indexName, lotValue] of Object.entries(lotValues)) {
              if (log.symbol?.includes(indexName)) { lot = lotValue; break; }
            }
            if (!lot) continue;
            if (log.orderStatus?.toLowerCase() === "completed" && log.exitLtp) {
              realizedPnl += (log.side === "B" ? (log.exitLtp - log.entryLtp) : (log.entryLtp - log.exitLtp)) * lot * log.lot;
            } else {
              const wb = ltpMap[log.symbolToken];
              if (wb?.LTP_Rate != null) {
                openPnl += (log.side === "B" ? (wb.LTP_Rate - log.entryLtp) : (log.entryLtp - wb.LTP_Rate)) * lot * log.lot;
              }
            }
          }
          return { account: acc.clientId, realizedPnl: realizedPnl.toFixed(2), openPnl: openPnl.toFixed(2), totalPnl: (realizedPnl + openPnl).toFixed(2) };
        }));
        socket.emit("accountWiseTagPnLUpdate", { success: true, data: accountWisePnl });
      }
    } catch (error) {
      console.error("Failed to emit initial account-wise tag PnL data:", error);
    }

    roomManager.cleanupEmptyRoomIntervals();
  });
}
