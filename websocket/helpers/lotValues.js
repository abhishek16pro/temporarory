const INDEX_ENV_MAP = [
  ["BANKNIFTY", "BNLot"],
  ["FINNIFTY", "FNLot"],
  ["MIDCPNIFTY", "MCNLot"],
  ["NIFTY", "NFLot"],
  ["SENSEX", "SXLot"],
];

export function resolveLotSize(symbol) {
  if (!symbol) return undefined;
  for (const [indexName, envKey] of INDEX_ENV_MAP) {
    if (symbol.includes(indexName)) return process.env[envKey];
  }
  return undefined;
}

export function getLotValues() {
  return {
    BANKNIFTY: process.env.BNLot,
    FINNIFTY: process.env.FNLot,
    MIDCPNIFTY: process.env.MCNLot,
    NIFTY: process.env.NFLot,
    SENSEX: process.env.SXLot,
  };
}
