import express from "express";
const router = express.Router();

import adminRoutes from "./modules/admin/routes.js";
import websiteRoutes from "./modules/website/routes.js";
import commonRoutes from "./modules/common/routes.js";
import userRoutes from "./modules/user/routes.js"
import stylist from "./modules/stylist/route.js";
import GoogleWebhookController from "./modules/common/GoogleWebhookController.js";

router.use("/admin", adminRoutes);
router.use("/website", websiteRoutes);
router.use("/common", commonRoutes);
router.use("/user", userRoutes);
router.use("/stylist", stylist);

// Google Play RTDN webhook — registered as /webservice/api/v1/webhook/android
// to match the URL configured in Google Play Console.
router.post("/webhook/android", GoogleWebhookController.notification);

export default router;
