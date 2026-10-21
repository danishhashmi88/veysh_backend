import express from "express";
import global from "../../../../helpers/global-functions.js";

import authRoutes from "../admin/auth/routes.js";
import userRoutes from "../admin/user/routes.js";
import testimonialRoutes from "../admin/testimonial/routes.js";
import dashboardRoutes from "../admin/dashboard/routes.js";
import emailTemplatesRoutes from "../admin/email-templates/routes.js";
import globalSettingsRoutes from "../admin/global-settings/routes.js";
import cmsRoutes from "../admin/cms/routes.js";
import bannerRoutes from "../admin/banner/routes.js";
import faqRoutes from "../admin/faq/routes.js";
import contactRoutes from "../admin/contactUs/routes.js";
import customerManagement from "../admin/customerManagement/routes.js";
import categoryRoutes from "../admin/category/routes.js";
import subCategory from "../admin/subCategory/routes.js";
import itemsManagement from "../admin/ItemManagement/routes.js";
import outfitManagement from "../admin/outfitManagement/routes.js";
import subscriptionManagement from "../admin/subscription/routes.js";
import reportedPostsRoutes from "../admin/reportedPosts/routes.js";
import Posts from "../admin/post/routes.js"; //
import brandRoutes from "../admin/brand/routes.js";
import userSubscriptionManagement from "../admin/userSubscriptionManagement/routes.js";
import iapTransactionManagement from "../admin/iapTransactionManagement/routes.js";
const router = express.Router();

router.use("/auth", authRoutes);
router.use("/user", global.isLoggedIn, global.isAdmin, userRoutes);
router.use("/testimonial", global.isLoggedIn, global.isAdmin, testimonialRoutes);
router.use("/dashboard", global.isLoggedIn, global.isAdmin, dashboardRoutes);
router.use("/email-templates", global.isLoggedIn, global.isAdmin, emailTemplatesRoutes);
router.use("/global-settings", global.isLoggedIn, globalSettingsRoutes);
router.use("/cms", global.isLoggedIn, global.isAdmin, cmsRoutes);
router.use("/banner", global.isLoggedIn, global.isAdmin, bannerRoutes);
router.use("/faq", global.isLoggedIn, global.isAdmin, faqRoutes);
router.use("/contactUs", global.isLoggedIn, global.isAdmin, contactRoutes);
router.use("/customerManagement", global.isLoggedIn, global.isAdmin, customerManagement);
router.use("/category", global.isLoggedIn, global.isAdmin, categoryRoutes);
router.use("/subCategory", global.isLoggedIn, global.isAdmin, subCategory);
router.use("/itemsManagement", global.isLoggedIn, global.isAdmin, itemsManagement);
router.use("/outfitManagement", global.isLoggedIn, global.isAdmin, outfitManagement);
router.use("/subscriptionManagement", global.isLoggedIn, global.isAdmin, subscriptionManagement);
router.use("/reportedPosts", global.isLoggedIn, global.isAdmin, reportedPostsRoutes);
router.use("/Posts", global.isLoggedIn, global.isAdmin, Posts);
router.use("/brand", global.isLoggedIn, global.isAdmin, brandRoutes);
router.use("/userSubscriptionManagement", global.isLoggedIn, global.isAdmin, userSubscriptionManagement);
router.use("/iapTransactionManagement", global.isLoggedIn, global.isAdmin, iapTransactionManagement);


export default router;
