import { stopTrading, startTrading, getSqoffTrading } from "../controllers/trading.js";
import express from "express";

const router = express.Router();

router.post("/stop-trading", stopTrading);
router.post("/start-trading", startTrading);
router.post('/sqoff', getSqoffTrading);

export default router;
