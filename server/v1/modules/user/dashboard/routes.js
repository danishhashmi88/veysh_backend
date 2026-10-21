import express from "express";
const router = express.Router();
import DashboardController from "./controller.js";
import DashboardValidator from "./validator.js";
import global from "../../../../../helpers/global-functions.js";

router.post("/get-wardrobe-insights", DashboardValidator.getWardrobeInsights, DashboardController.getWardrobeInsights);
router.get("/dashboard-latest-posts", DashboardController.getLatestPosts);
router.get("/wardrobe-dashboard", global.isLoggedIn, DashboardController.getWardrobeDashboardStats);
// router.get("/wardrobe-insights-dashboard", global.isLoggedIn, DashboardController.getWardrobeDashboardStats);

export default router ;
