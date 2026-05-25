import express from "express";
import * as analytics from "../controllers/analytics.js";
import jwtToken from "../middleware/jwt.js";
const router = express.Router();

router.get("/mtm", jwtToken, analytics.getMtmAnalytics);
router.get("/mtm/client-wise", jwtToken, analytics.getClientWiseMtmAnalytics);
router.get("/mtm/latest", jwtToken, analytics.getLatestMtmData);
router.get("/mtm/client/:clientId/:days?", jwtToken, analytics.getClientMtmHistory);
router.get("/chart/client/:clientId/:days?", jwtToken, analytics.getClientMtmChart);
router.get("/chart/all-clients", jwtToken, analytics.getAllClientsMtmChart);
router.post("/mtm/trigger-save", jwtToken, analytics.triggerSaveMtmPositions);
router.get("/mtm/statistics", jwtToken, analytics.getMtmStatistics);
router.get("/mtm/download", jwtToken, analytics.downloadMonthlyMtmData); 

export default router;