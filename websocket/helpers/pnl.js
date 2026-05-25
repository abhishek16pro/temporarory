import { resolveLotSize } from "./lotValues.js";

export function computeLogPnl(log, ltpMap) {
  const lotSize = resolveLotSize(log.symbol);
  if (!lotSize) return { pnl: 0, runningLtp: undefined, lotSize: undefined };

  const status = (log.orderStatus || "").toLowerCase();

  if (status === "completed") {
    const pnl =
      (log.side === "B" ? log.exitLtp - log.entryLtp : log.entryLtp - log.exitLtp) *
      lotSize *
      log.lot;
    return { pnl, runningLtp: log.exitLtp, lotSize };
  }

  const wb = ltpMap[log.symbolToken];
  const ltp = wb?.LTP_Rate;
  if (ltp == null) return { pnl: 0, runningLtp: ltp, lotSize };

  const pnl =
    (log.side === "B" ? ltp - log.entryLtp : log.entryLtp - ltp) * lotSize * log.lot;
  return { pnl, runningLtp: ltp, lotSize };
}

export function splitRealizedOpenPnl(log, ltpMap) {
  const lotSize = resolveLotSize(log.symbol);
  if (!lotSize) return { realized: 0, open: 0 };

  const status = (log.orderStatus || "").toLowerCase();

  if (status === "completed" && log.exitLtp) {
    const realized =
      (log.side === "B" ? log.exitLtp - log.entryLtp : log.entryLtp - log.exitLtp) *
      lotSize *
      log.lot;
    return { realized, open: 0 };
  }

  const wb = ltpMap[log.symbolToken];
  if (wb?.LTP_Rate == null) return { realized: 0, open: 0 };

  const open =
    (log.side === "B" ? wb.LTP_Rate - log.entryLtp : log.entryLtp - wb.LTP_Rate) *
    lotSize *
    log.lot;
  return { realized: 0, open };
}
