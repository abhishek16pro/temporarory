import StgLog from "../../models/stgLog.js";
import StrategySchema from "../../models/strategy.js";
import StgTag from "../../models/tag.js";
import redisConnect from "../../utils/redisConnect.js";
import { buildLtpMap, collectOpenTokens } from "../helpers/ltp.js";
import { computeLogPnl } from "../helpers/pnl.js";

const client = redisConnect();

export async function getLiveStgLogs(stgName) {
  try {
    const strategy = await StrategySchema.findOne({ name: stgName })
      .lean()
      .select("tag");

    let mappedAccounts = [];
    if (strategy?.tag) {
      const tagDetails = await StgTag.findOne({ tag: strategy.tag })
        .lean()
        .select("mappedAccount");
      if (tagDetails?.mappedAccount) mappedAccounts = tagDetails.mappedAccount;
    }

    const table = await StgLog.find({ name: stgName })
      .lean()
      .select(
        "name clientId leg symbol symbolToken entryLtp side lot exitLtp orderStatus entryTime exitTime tag",
      );

    let view;
    try {
      const redisData = await client.get(`VIEW:${stgName}_view`);
      if (redisData) view = JSON.parse(redisData);
    } catch {
      view = undefined;
    }

    const tokens = collectOpenTokens(table);
    const ltpMap = await buildLtpMap(client, tokens);

    const logs = table.map((row) => {
      const { pnl, runningLtp, lotSize } = computeLogPnl(row, ltpMap);
      return {
        name: row.name,
        clientId: row.clientId,
        leg: row.leg,
        symbol: row.symbol,
        symbolToken: row.symbolToken,
        entryLtp: row.entryLtp,
        side: row.side,
        lot: row.lot,
        exitLtp: row.exitLtp,
        orderStatus: row.orderStatus,
        entryTime: row.entryTime,
        exitTime: row.exitTime,
        stoploss: view?.log?.[row.leg]?.stopLoss ?? 0,
        target: view?.log?.[row.leg]?.target ?? 0,
        running_ltp: runningLtp,
        pnl: lotSize ? pnl.toFixed(2) : "0.00",
      };
    });

    return {
      logs,
      mappedAccounts,
      tag: strategy?.tag ?? null,
    };
  } catch (error) {
    console.error("Error fetching strategy logs:", error.message);
    return { logs: [], mappedAccounts: [], tag: null };
  }
}
