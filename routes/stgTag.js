import express from "express";
import * as stgTag from "../controllers/stgTag.js";
import jwtToken from "../middleware/jwt.js";

const router = express.Router();

router.post("/add", jwtToken, stgTag.addTag);
router.put("/update", jwtToken, stgTag.updateTag);
router.post("/remove", jwtToken, stgTag.removeTag);
router.delete("/delete/:tag", jwtToken, stgTag.deleteTag);
router.get("/list", jwtToken, stgTag.getAllTags);
router.get("/details/:tag", jwtToken, stgTag.getTagDetails);
router.post("/setMultiplier", jwtToken, stgTag.setMultiplier);
router.get("/sqoffTagStrategy", jwtToken, stgTag.sqoffTagStrategy);
router.post("/copy", jwtToken, stgTag.copyTag);
router.post("/reset", jwtToken, stgTag.resetTag);

router.post("/import", jwtToken, stgTag.importTags); 
router.post("/export", jwtToken, stgTag.exportTags);

export default router; 