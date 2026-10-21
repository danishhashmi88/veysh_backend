import express from "express";
const router = express.Router();
import ClosetInsightsController from "./controller.js";
import ClosetInsightsValidator from "./validator.js";
import global from "../../../../../helpers/global-functions.js";

router.get("/get-closet-insights", ClosetInsightsController.getClosetInsightStats);

export default router;
