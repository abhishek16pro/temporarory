import express from "express";
import { getLogs } from "../controllers/logs.js";

const router = express.Router();

// GET /api/logs?page=1&limit=10&name=...&key=...&type=...&message=...
router.get("/", getLogs);

export default router;