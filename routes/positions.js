import express from "express";
import * as position from "../controllers/positions.js";
import jwtToken from "../middleware/jwt.js";
const router = express.Router();

router.get("/list", jwtToken, position.getPositions);
router.get("/pending-orders", jwtToken, position.getPendingOrders);
router.get("/pending-orders-by-client", jwtToken, position.getPendingOrdersByClient);

export default router;