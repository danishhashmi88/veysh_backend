import express from "express";
import authRoutes from "./auth/routes.js";
import profileRoutes from "./profile/routes.js";
import notificationRoutes from "./notification/routes.js";
import categoryRoutes from "./userCategory/routes.js";
import itemRoutes from "./items/routes.js";
import outfitRoutes from "./outfit/routes.js";
import postsRoutes from "./posts/routes.js"
import Global from "../../../../helpers/global-functions.js";
import plannerRoutes from "./planner/routes.js"
import dashboardRoutes from "./dashboard/routes.js"
import subscriptionRoutes from "./purchaseSubscription/routes.js"
import closetInsights from "./closetInsights/routes.js"
import myLookbookRoutes from "./myLookbook/routes.js"
import chatRoutes from "./chat/routes.js"
import commonRoutes from "./common/routes.js"
import brandRoutes from "../admin/brand/routes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/category", Global.isLoggedIn, categoryRoutes);
router.use("/brand", Global.isLoggedIn, brandRoutes);
router.use("/items", Global.isLoggedIn, itemRoutes);
router.use("/outfits", Global.isLoggedIn, outfitRoutes);
router.use("/posts", Global.isLoggedIn, postsRoutes);
router.use("/planner", Global.isLoggedIn, plannerRoutes);
router.use("/subscribe", Global.isLoggedIn, subscriptionRoutes);
router.use("/profile", Global.isLoggedIn, profileRoutes);
router.use("/notification", notificationRoutes);
router.use("/dashboard", Global.isLoggedIn, dashboardRoutes);
router.use("/closet", Global.isLoggedIn, closetInsights);
router.use("/lookbook", Global.isLoggedIn, myLookbookRoutes);
router.use("/chat", Global.isLoggedIn, chatRoutes);
router.use("/common", Global.isLoggedIn, commonRoutes);

export default router;


