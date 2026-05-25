import express from "express";
import * as marketData from "../controllers/marketData.js";
import jwtToken from "../middleware/jwt.js";

const router = express.Router();

// index
router.get("/index/list", jwtToken, marketData.getAllIndices);
router.post("/index/seed", jwtToken, marketData.seedIndices);
router.post("/index/create", jwtToken, marketData.createIndex);
router.put("/index/update/:id", jwtToken, marketData.updateIndex);
router.delete("/index/delete/:id", jwtToken, marketData.deleteIndex);

// datafeed keys
router.get("/apiKey/list", jwtToken, marketData.getAllDataFeedKeys);
router.post("/apiKey/create", jwtToken, marketData.addDataFeedKeys);
router.put("/apiKey/update/:id", jwtToken, marketData.updateDataFeedKeys);
router.delete("/apiKey/delete/:id", jwtToken, marketData.deleteDataFeedKeys);
export default router;
