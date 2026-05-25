import { placeOrder, cancelOrder, cancelAllOrders } from "../controllers/orderManagement.js";
import express from "express";

const router = express.Router();

router.post("/modify-order", placeOrder);
router.post("/cancel-order", cancelOrder);
router.post("/cancel-all-orders", cancelAllOrders);

export default router;