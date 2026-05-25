import redisConnect from "../utils/redisConnect.js";
const client = redisConnect();

// client.connect();

const indexData = [
    {
        name: "NIFTY",
        atmKey: "NFATM",
        token: 26000,
        strikeDiff: 50,
        exchangeSegment: "NSECM",
    },
    {
        name: "BANKNIFTY",
        atmKey: "BNATM",
        token: 26001,
        strikeDiff: 100,
        exchangeSegment: "NSECM",
    },
    {
        name: "MIDCPNIFTY",
        atmKey: "MCPATM",
        token: 26121,
        strikeDiff: 25,
        exchangeSegment: "NSECM",
    },
    {
        name: "FINNIFTY",
        atmKey: "FNATM",
        token: 26034,
        strikeDiff: 50,
        exchangeSegment: "NSECM",
    },
    {
        name: "SENSEX",
        atmKey: "SXATM",
        token: 26065,
        strikeDiff: 100,
        exchangeSegment: "BSECM",
    },
];

const updateLowHigh = async (indexName, currentStraddle) => {
    try {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        
        const stabilizationTime = new Date(now);
        stabilizationTime.setHours(9, 15, 5, 0);

        const lowHighKey = `${indexName}_LOWHIGH`;
        const existingData = await client.get(lowHighKey);

        let parsed = existingData ? JSON.parse(existingData) : null;

        if (parsed && parsed.lastUpdated && !parsed.lastUpdated.startsWith(todayStr)) {
            parsed = { low: 0, high: 0, lastUpdated: now.toISOString() };
            await client.set(lowHighKey, JSON.stringify(parsed));
        }

        if (now < stabilizationTime) {
            return parsed || { low: 0, high: 0, lastUpdated: now.toISOString() };
        }

        let low = currentStraddle;
        let high = currentStraddle;

        if (parsed && parsed.low !== 0) {
            low = Math.min(parsed.low, currentStraddle);
            high = Math.max(parsed.high, currentStraddle);
        }

        const lowHighData = {
            low,
            high,
            lastUpdated: now.toISOString(),
        };

        await client.set(lowHighKey, JSON.stringify(lowHighData));
        return lowHighData;

    } catch (error) {
        console.error(`Error updating low/high for ${indexName}:`, error);
    }
};

const getStraddle = async () => {
    try {
        const underlyingPromises = indexData.map(({ token }) => client.get(token));
        const underlyingResults = await Promise.all(underlyingPromises);
        
        const straddlePromises = indexData.map(async (index, i) => {
            const underlyingData = underlyingResults[i];
            if (!underlyingData) return null;
            
            const { name, strikeDiff } = index;
            const underlying = JSON.parse(underlyingData);
            const atmStrike = Math.round(underlying.Rate / strikeDiff) * strikeDiff;
            
            const [ceData, peData] = await Promise.all([
                client.get(`${name}CE`),
                client.get(`${name}PE`)
            ]);
            
            if (!ceData || !peData) return null;
            
            const ceStrikes = JSON.parse(ceData);
            const peStrikes = JSON.parse(peData);
            
            const currCE = `${name}${atmStrike}CE`;
            const currPE = `${name}${atmStrike}PE`;
            
            const ceObj = ceStrikes.find(obj => obj[currCE]);
            const peObj = peStrikes.find(obj => obj[currPE]);
            
            if (!ceObj || !peObj) return null;
            
            const [ceRateData, peRateData] = await Promise.all([
                client.get(ceObj[currCE]),
                client.get(peObj[currPE])
            ]);
            
            const ceRate = ceRateData ? JSON.parse(ceRateData).LTP_Rate : 0;
            const peRate = peRateData ? JSON.parse(peRateData).LTP_Rate : 0;
            const ceVwap = ceRateData ? JSON.parse(ceRateData).LTP_AvgTradePrice : 0;
            const peVwap = peRateData ? JSON.parse(peRateData).LTP_AvgTradePrice : 0;
            const upOrDownPercentageFromVwap = ((ceRate + peRate) - (ceVwap + peVwap)) / (ceVwap + peVwap) * 100;
            
            const currentStraddle = parseFloat((ceRate + peRate).toFixed(2));
            
            const lowHighData = await updateLowHigh(name, currentStraddle);
            
            return {
                indexName: name,
                atmStrike,
                currentStraddle: currentStraddle.toFixed(2),
                isPriceDownfromCombinedVwap: (ceVwap + peVwap) > (ceRate + peRate) ? true : false,
                upOrDownPercentageFromVwap: upOrDownPercentageFromVwap.toFixed(2),
                low: lowHighData?.low || 0,
                high: lowHighData?.high || 0,
                lastUpdated: lowHighData?.lastUpdated || null,
            };
        });
        
        const results = await Promise.all(straddlePromises);
        const straddleResults = results.filter(result => result !== null);
        
        return straddleResults;
        
    } catch (error) {
        console.error('Error in getStraddle:', error);
        return [];
    }
};


export default getStraddle;