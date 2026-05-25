export function collectOpenTokens(logs) {
  const tokens = new Set();
  for (const log of logs) {
    if ((log.orderStatus || "").toLowerCase() !== "completed") {
      tokens.add(log.symbolToken);
    }
  }
  return Array.from(tokens);
}

export async function buildLtpMap(redisClient, tokens) {
  if (!tokens.length) return {};
  const values = await redisClient.mget(tokens);
  const map = {};
  tokens.forEach((token, index) => {
    const raw = values[index];
    if (!raw) return;
    try {
      map[token] = JSON.parse(raw);
    } catch {
      // skip invalid JSON
    }
  });
  return map;
}

export async function buildViewMap(redisClient, strategyNames) {
  if (!strategyNames.length) return {};
  const keys = strategyNames.map((name) => `VIEW:${name}_view`);
  const values = await redisClient.mget(keys);
  const map = {};
  strategyNames.forEach((name, index) => {
    const raw = values[index];
    if (!raw) return;
    try {
      map[name] = JSON.parse(raw);
    } catch {
      // skip invalid JSON
    }
  });
  return map;
}
