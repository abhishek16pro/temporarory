import StgLog from "../../models/stgLog.js";
import StrategySchema from "../../models/strategy.js";
import StgTag from "../../models/tag.js";
import redisConnect from "../../utils/redisConnect.js";

const redisClient = redisConnect();

async function getLiveStgLogs(stgName) {
  const strategy = await StrategySchema.findOne({ name: stgName }).lean().select("tag");

  let mappedAccounts = [];
  if (strategy?.tag) {
    const tagDetails = await StgTag.findOne({ tag: strategy.tag }).lean().select("mappedAccount");
    if (tagDetails?.mappedAccount) mappedAccounts = tagDetails.mappedAccount;
  }

  const table = await StgLog.find({ name: stgName })
    .lean()
    .select("name clientId leg symbol symbolToken entryLtp side lot exitLtp orderStatus entryTime exitTime tag");

  let parsedData;
  try {
    const redisData = await redisClient.get(`VIEW:${stgName}_view`);
    if (redisData) parsedData = JSON.parse(redisData);
  } catch {
    parsedData = null;
  }

  const tokens = table
    .filter((row) => (row.orderStatus || "").toLowerCase() !== "completed")
    .map((row) => row.symbolToken);
  const uniqueTokens = Array.from(new Set(tokens));
  const tokenValues = uniqueTokens.length ? await redisClient.mget(uniqueTokens) : [];
  const ltpMap = {};

  uniqueTokens.forEach((token, index) => {
    const raw = tokenValues[index];
    if (raw) {
      try {
        ltpMap[token] = JSON.parse(raw);
      } catch {
        // ignore parse errors
      }
    }
  });

  const data = table.map((row) => {
    const obj = {
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
      stoploss: parsedData?.log?.[row.leg]?.stopLoss ?? 0,
      target: parsedData?.log?.[row.leg]?.target ?? 0,
    };

    let lot;
    if (obj.symbol?.includes("BANKNIFTY")) lot = process.env.BNLot;
    else if (obj.symbol?.includes("FINNIFTY")) lot = process.env.FNLot;
    else if (obj.symbol?.includes("MIDCPNIFTY")) lot = process.env.MCNLot;
    else if (obj.symbol?.includes("NIFTY")) lot = process.env.NFLot;
    else if (obj.symbol?.includes("SENSEX")) lot = process.env.SXLot;

    if ((row.orderStatus || "").toLowerCase() === "completed") {
      obj.running_ltp = row.exitLtp;
      obj.pnl = (
        (row.side === "B" ? row.exitLtp - row.entryLtp : row.entryLtp - row.exitLtp) *
        lot *
        obj.lot
      ).toFixed(2);
    } else {
      const wb = ltpMap[row.symbolToken];
      obj.running_ltp = wb?.LTP_Rate;
      obj.pnl = wb?.LTP_Rate != null
        ? ((row.side === "B" ? wb.LTP_Rate - row.entryLtp : row.entryLtp - wb.LTP_Rate) * lot * obj.lot).toFixed(2)
        : "0.00";
    }

    return obj;
  });

  return {
    logs: data,
    mappedAccounts,
    tag: strategy?.tag ?? null,
  };
}

export function registerStrategyHandlers(socket, roomManager) {
  socket.on("subscribeStg", async ({ stgName }) => {
    if (!stgName) return;
    const roomName = `stg:${stgName}`;
    socket.join(roomName);
    roomManager.schedule(roomName, 1000, () => getLiveStgLogs(stgName), "getStgLog");

    try {
      const initialData = await getLiveStgLogs(stgName);
      socket.emit("getStgLog", initialData);
    } catch (error) {
      console.error("Failed to send initial strategy log data:", error);
    }

    roomManager.cleanupEmptyRoomIntervals();
  });

  socket.on("unsubscribeStg", ({ stgName }) => {
    if (!stgName) return;
    const roomName = `stg:${stgName}`;
    socket.leave(roomName);
    roomManager.cleanupEmptyRoomIntervals();
  });
}
