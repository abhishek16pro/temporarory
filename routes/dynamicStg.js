import express from "express";
import * as pullBack from "../controllers/dynamicStg.js";
import jwtToken from "../middleware/jwt.js";

const router = express.Router();


router.post("/createpullback", jwtToken, pullBack.pullbackCreate);
router.get("/getpullback", jwtToken, pullBack.pullBackGetData);
router.delete("/deletepullback/:id", jwtToken, pullBack.pullBackDelete);
router.put("/updatepullback/:id", jwtToken, pullBack.pullBackUpdate);
router.patch("/toggle/:id", jwtToken, pullBack.pullBackToggle);

export default router;