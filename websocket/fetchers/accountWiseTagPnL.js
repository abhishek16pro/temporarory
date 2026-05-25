import StgLog from "../../models/stgLog.js";
import StrategySchema from "../../models/strategy.js";
import StgTag from "../../models/tag.js";
import redisConnect from "../../utils/redisConnect.js";
import { buildLtpMap, collectOpenTokens } from "../helpers/ltp.js";
import { splitRealizedOpenPnl } from "../helpers/pnl.js";

const client = redisConnect();

export async function getAccountWiseTagPnL(tag) {
  const tagDetails = await StgTag.findOne({ tag }).lean();
  if (!tagDetails) {
    return { success: false, data: [], message: "Tag not found" };
  }

  const tagWiseStgs = await StrategySchema.find({ tag }).lean().select("name tag");
  const stgNames = tagWiseStgs.map((stg) => stg.name);
  const stgTagMap = {};
  tagWiseStgs.forEach((stg) => { stgTagMap[stg.name] = stg.tag; });

  const allStgLogs = await StgLog.find({ name: { $in: stgNames } }).lean();
  const tokens = collectOpenTokens(allStgLogs);
  const ltpMap = await buildLtpMap(client, tokens);

  const accountWisePnl = (tagDetails.mappedAccount || []).map((acc) => {
    let realizedPnl = 0;
    let openPnl = 0;
    for (const log of allStgLogs) {
      if (log.clientId !== acc.clientId) continue;
      if (stgTagMap[log.name] !== tag) continue;
      const { realized, open } = splitRealizedOpenPnl(log, ltpMap);
      realizedPnl += realized;
      openPnl += open;
    }
    return {
      account: acc.clientId,
      realizedPnl: realizedPnl.toFixed(2),
      openPnl: openPnl.toFixed(2),
      totalPnl: (realizedPnl + openPnl).toFixed(2),
    };
  });

  return { success: true, data: accountWisePnl };
}
