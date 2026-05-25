import StrategySchema from "../../models/strategy.js";
import redisConnect from "../../utils/redisConnect.js";
import { saveLog } from "../../../shared/utils/saveLogs.js";
import { REDIS_MESSAGES } from "../../../shared/constants/redisConstant.js";

const client = redisConnect();

export async function handleTagSquareOff(
  tag,
  adjustedTotalPnl,
  isLossBreach,
  maxLoss,
  maxProfit,
  sqoffDoneKey,
) {
  const lockKey = `tag:${tag}:sqoff_lock`;

  try {
    const lockResult = await client.set(lockKey, Date.now().toString(), "NX", "EX", 60);
    if (lockResult !== "OK") return;

    try {
      const runningStrategies = await StrategySchema.find(
        { tag, status: "Running" },
        { _id: 1 },
      );

      if (runningStrategies.length > 0) {
        const pipeline = client.pipeline();
        runningStrategies.forEach((strategy) => {
          const key = `SQOFF:${strategy._id}`;
          const sqoffMessage = JSON.stringify({ message: REDIS_MESSAGES.STRATEGY_MANUAL_SQOFF });
          pipeline.set(key, sqoffMessage);
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

      const keyPrefix = `tag:${tag}:`;
      await Promise.all([
        client.del(`${keyPrefix}breach_status`),
        client.del(`${keyPrefix}logged_wait`),
      ]);
    } finally {
      await client.del(lockKey);
    }
  } catch (error) {
    console.error(`Error in auto square-off for tag ${tag}:`, error);
    await saveLog(
      "ERROR",
      "AUTO_SQOFF",
      `Failed to auto square-off tag ${tag}: ${error.message}`,
    );
  }
}

export async function handleBreachAndSquareOff(
  tag,
  adjustedTotalPnl,
  maxLoss,
  maxProfit,
  maxLossWaitSeconds,
  maxProfitWaitSeconds,
) {
  const keyPrefix = `tag:${tag}:`;
  const sqoffDoneKey = `${keyPrefix}sqoff_done`;
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
  } catch (e) {
    console.error("Error parsing breach status:", e);
  }

  if (!isBreach) {
    if (parsedStatus) {
      await Promise.all([
        client.del(breachStatusKey),
        client.del(loggedWaitKey),
      ]);
      await saveLog(
        "BREACH_RECOVERY",
        "MESSAGE",
        `Tag ${tag} recovered from ${parsedStatus.type} breach. Current PnL: ${adjustedTotalPnl.toFixed(2)}`,
      );
    }
    return;
  }

  if (!parsedStatus) {
    await client.set(
      breachStatusKey,
      JSON.stringify({ type: breachType, startTime: Date.now(), waitSeconds }),
    );
    if (waitSeconds > 0) {
      await client.set(loggedWaitKey, "1", "EX", waitSeconds + 5);
      await saveLog(
        "AUTO_SQOFF_WAIT",
        "MESSAGE",
        `Auto square-off wait started for tag ${tag} due to ${breachType} breach. Will check again after ${waitSeconds} seconds.`,
      );
    } else {
      await handleTagSquareOff(tag, adjustedTotalPnl, isLossBreach, maxLoss, maxProfit, sqoffDoneKey);
    }
    return;
  }

  if (parsedStatus.type !== breachType) {
    await client.set(
      breachStatusKey,
      JSON.stringify({ type: breachType, startTime: Date.now(), waitSeconds }),
    );
    if (waitSeconds > 0) {
      await client.del(loggedWaitKey);
      await client.set(loggedWaitKey, "1", "EX", waitSeconds + 5);
      await saveLog(
        "AUTO_SQOFF_WAIT",
        "MESSAGE",
        `Breach type changed to ${breachType} for tag ${tag}. Starting new wait period of ${waitSeconds} seconds.`,
      );
    } else {
      await handleTagSquareOff(tag, adjustedTotalPnl, isLossBreach, maxLoss, maxProfit, sqoffDoneKey);
    }
    return;
  }

  const elapsedTime = Date.now() - parsedStatus.startTime;
  if (elapsedTime >= parsedStatus.waitSeconds * 1000) {
    if (isBreach) {
      await saveLog(
        "AUTO_SQOFF_AFTER_WAIT",
        "MESSAGE",
        `Auto square-off triggered for tag ${tag} after ${waitSeconds} seconds wait. ${breachType} breach still persists.`,
      );
      await handleTagSquareOff(tag, adjustedTotalPnl, isLossBreach, maxLoss, maxProfit, sqoffDoneKey);
    } else {
      await Promise.all([
        client.del(breachStatusKey),
        client.del(loggedWaitKey),
      ]);
    }
  }
}
