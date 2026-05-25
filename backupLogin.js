import axios from "axios";
import Redis from "ioredis";

const redisExecution = new Redis({
  host: "94.136.188.235",
  port: 6379,
  password: "Deriv1x@786",
});

// ---------------------------------------------
// ⭐ API CONFIGURATIONS
// ---------------------------------------------
const API_CONFIG = {
  OLD: {
    url: "http://103.217.66.212:3000/interactive/user/session",
    body: {
      secretKey: "Voxq767@dT",
      appKey: "65fc6788e35587171e5527",
      source: "WEBAPI",
    },
  },
  NEW: {
    url: "http://sapi.shareindia.com:3009/interactive/user/session",
    body: {
      secretKey: "Txgr325#pM",
      appKey: "32c994c8a07e2993aa8326",
      source: "WEBAPI",
    },
  },
  NEW1: {
    url: "https://xts.mastertrust.co.in//interactive/user/session",
    body: {
      secretKey: "Fpbn728@d0",
      appKey: "24e4f9593d8f016223d796",
      source: "WEBAPI",
    },
  },
  NEW2: {
    url: "https://moxtsapi.motilaloswal.com:3000/interactive/user/session",
    body: {
      "secretKey": "Hhxv320#p8",
      "appKey": "5320cb2e812aa5e0617707",
      "source": "WEBAPI"
    }
  },
  // NEW3: {
  //   url: "http://150.129.144.106:3000/interactive/user/session",
  //   body: {
  //     "secretKey": "Fsxo464$EP",
  //     "appKey": "c31688ea72c72099755168",
  //     "source": "WEBAPI"
  //   }
  // },
  // NEW4 : {
  //   url : "https://gdhan.ganeshstock.com:3000/interactive/user/session",
  //   body : {
  //   "secretKey": "Ekvi161$Du",
  //   "appKey": "eb938fcd4f3e19ccd14306",
  //   "source": "WEBAPI"
  //   }
  // }
  // NEW4: {
  //   url: "https://xts.rikhav.net:3000/interactive/user/session",
  //   body: {
  //     "secretKey": "Eiwv444$eS",
  //     "appKey": "ce1868f94916aa5df94484",
  //     "source": "WEBAPI"
  //   }
  // }
};

// ---------------------------------------------
// ⭐ SAVE TOKEN FOR ONE API
// ---------------------------------------------
async function saveTokenForApi(apiName, config) {
  const { url, body } = config;

  console.log(`\n🔄 [${apiName}] Sending POST request...`);

  const response = await axios.post(url, body);
  // console.log("res=>", response);

  const data = response.data;

  if (data?.type !== "success") {
    throw new Error(`[${apiName}] API Error: ${data?.description}`);
  }

  const { token, clientCodes = [], userID } = data.result || {};

  if (!token || clientCodes.length === 0) {
    throw new Error(`[${apiName}] Missing token or client codes`);
  }

  console.log(`✅ [${apiName}] Token received for userID: ${userID}`);
  console.log(`💾 [${apiName}] Saving ${clientCodes.length} client(s)...`);

  for (const client of clientCodes) {
    if (client === "2CCQ4NS") continue;
    await redisExecution.hset("auth", client, token);
    console.log(`  → [${apiName}] Saved ${client}`);
  }
}

// ---------------------------------------------
// ⭐ MAIN EXECUTOR (RUN ALL)
// ---------------------------------------------
async function runAllApis() {
  try {
    for (const [apiName, config] of Object.entries(API_CONFIG)) {
      try {
        await saveTokenForApi(apiName, config);
      } catch (err) {
        console.error(`❌ ${err.message}`);
      }
    }

    console.log("\n🎉 All API executions completed");
  } catch (err) {
    console.error("❌ Fatal Error:", err.message);
  } finally {
    await redisExecution.quit();
  }
}

runAllApis();

/*
RADHASWAMI 

*/