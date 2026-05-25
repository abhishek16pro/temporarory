import express from "express";
import * as sqOffService from "../controllers/sqoff-service.js";
const router = express.Router();

router.post("/push-into-redis", sqOffService.pushIntoRedis);
router.post("/sqoff-by-client-code", sqOffService.sqoffByClientCode);

export default router;
