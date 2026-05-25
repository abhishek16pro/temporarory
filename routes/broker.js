import * as broker from "../controllers/broker.js";
import * as historyTrades from "../controllers/historytrades.js";
import express from "express";
const router = express.Router();

router.get("/list", broker.getBrokerList);
router.post("/add", broker.addBroker);
router.get("/verify", broker.verifyClient);
router.get("/history-trades", historyTrades.getHistoryTrades);
router.get("/all-trades-details", historyTrades.allTradesDetails);

export default router;
