import express from "express";
import * as strategy from "../controllers/strategy.js";
import jwtToken from "../middleware/jwt.js";
const router = express.Router();

// Strategy routes

// Post Routes
router.post("/add", jwtToken, strategy.addStrategy);
// router.post('/addTag', jwtToken, strategy.addTag);
router.post("/updateTag", jwtToken, strategy.updateTag);
router.post("/update/:_id", jwtToken, strategy.updateStrategy);
router.post("/sqoffstg/:_id", jwtToken, strategy.sqoffStg);
router.post("/sqoffall", jwtToken, strategy.sqoffAllStg); // Added route for sqoffAllStg
router.post('/delete', jwtToken, strategy.deleteStrategy);
router.post('/copy', jwtToken, strategy.copyStrategy);
router.post('/saveUpdatedFields', jwtToken, strategy.saveUpdatedFields);

// router.post('/sqOffByClientCode', jwtToken, strategy.sqOffByClientCode);

router.post("/loadStrategy/:_id", jwtToken, strategy.loadStrategy);
router.post("/unloadStrategy/:_id", jwtToken, strategy.unloadStrategy);
router.post("/loadAllStrategy", jwtToken, strategy.loadAllStrategy);

//get Routes
router.get("/listTag", jwtToken, strategy.stgTagList);
router.get("/list", jwtToken, strategy.strategyList);
router.get("/detail/:_id", jwtToken, strategy.strategyData);


// IMPORT EXPORT
router.post("/import", jwtToken, strategy.importStrategy);
router.get("/export", jwtToken, strategy.exportStrategy);

router.post("/sqoff-all", strategy.sqoffAllStg);
router.post("/margin", strategy.getUtilizedMargin);
export default router;