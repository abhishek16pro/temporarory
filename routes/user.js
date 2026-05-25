import express from "express";
import * as crud from "../controllers/user.js";
import jwtToken from "../middleware/jwt.js";
const router = express.Router();

// user routes
router.post("/user/add", jwtToken, crud.newClient);
router.post("/user/update/:userId/:Parent", jwtToken, crud.clientUpdate);
// router.post("/user/status/:UserId", jwtToken, crud.tradestatus);
router.post("/user/delete/:userId", jwtToken, crud.userDelete);

router.get("/user/details/:userId", jwtToken, crud.userDetails);
router.get("/user/Users", jwtToken, crud.getClients);
router.get("/user/UsersWithoutMargin", jwtToken, crud.getClientsWithoutMargin);
router.post("/user/refresh-margin/:userId", jwtToken, crud.updateMarginForIndividualUser);
router.post("/user/bulkstatus", jwtToken, crud.bulkStatus);
router.get("/reconcile", jwtToken, crud.reconcileMappedClients);

// log routes
// router.get("/user/logs", jwtToken, crud.getLogs);
// router.post("/user/stgLogs", jwtToken, crud.getstgLog);

// Admin Routes
router.post("/login", crud.adminlogin);
// router.post("/add", crud.adminadd);
// router.post("/dealerlogin", jwtToken, crud.dealerLogin);
router.post("/sqoff-single-client", jwtToken, crud.singleClientSqoff);

export default router;