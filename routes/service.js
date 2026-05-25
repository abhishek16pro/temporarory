import express from "express";
import * as service from "../controllers/service.js";
import jwtToken from "../middleware/jwt.js";
const router = express.Router();

router.get("/process", jwtToken, service.getPM2Processes);
router.post("/start", jwtToken, service.startPM2Process);
router.post("/stop", jwtToken, service.stopPM2Process);

export default router;