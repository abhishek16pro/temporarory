import express from "express";
import * as syncStatus from "../controllers/syncStatus.js";
import jwtToken from "../middleware/jwt.js";
const router = express.Router();

router.get("/", syncStatus.getSyncStatus);
router.get("/stream", syncStatus.getSyncStatusSSE);
router.post("/broadcast", syncStatus.triggerBroadcast);
router.get("/connections", (req, res) => {
  res.json({
    activeConnections: syncStatus.getActiveConnectionsCount()
  });
});

export default router;