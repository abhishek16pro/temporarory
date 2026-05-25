import StgLog from "../../models/stgLog.js";
import StrategySchema from "../../models/strategy.js";
import account from "../../models/account.js";
import redisConnect from "../../utils/redisConnect.js";
import { buildLtpMap, buildViewMap, collectOpenTokens } from "../helpers/ltp.js";
import { computeLogPnl } from "../helpers/pnl.js";

const client = redisConnect();

export async function fetchStgData(runOnDays) {
  try {
    const query = runOnDays?.length > 0 ? { runOnDay: { $in: runOnDays } } : {};

    const data = await StrategySchema.find(query, "name status _id loaded tag index").lean();
    const user = await account.findOne({ parent: true }, "userId multiplier").lean();

    const table = await StgLog.aggregate([
      {
        $match: {
          $expr: {
            $and: [
              { $in: ["$name", data.map((item) => item.name)] },
              { $eq: ["$clientId", user.userId] },
            ],
          },
        },
      },
    ]);

    const strategyNames = Array.from(new Set(table.map((t) => t.name)));
    const viewMap = await buildViewMap(client, strategyNames);

    const tokens = collectOpenTokens(table);
    const ltpMap = await buildLtpMap(client, tokens);

    const aggregatedData = {};
    for (const row of table) {
      const view = viewMap[row.name];
      const { pnl, lotSize } = computeLogPnl(row, ltpMap);
      const stoploss = view?.log?.[row.leg]?.stopLoss ?? 0;
      const target = view?.log?.[row.leg]?.target ?? 0;
      const numericPnl = lotSize ? parseFloat(pnl.toFixed(2)) : 0;

      if (!aggregatedData[row.name]) {
        aggregatedData[row.name] = { name: row.name, totalPnl: numericPnl };
      } else {
        aggregatedData[row.name].totalPnl += numericPnl;
      }

      // keep stoploss/target lookups warm — preserves behavior parity with legacy
      void stoploss;
      void target;
    }

    const aggregatedArray = Object.values(aggregatedData);

    return data.map((item) => {
      const matchingItem = aggregatedArray.find((aggItem) => aggItem.name === item.name);
      return {
        _id: item._id,
        status: item.status,
        loaded: item.loaded,
        name: item.name,
        tag: item.tag,
        index: item.index,
        totalPnl: matchingItem ? matchingItem.totalPnl : 0,
      };
    });
  } catch (error) {
    console.log(error);
    return [];
  }
}
