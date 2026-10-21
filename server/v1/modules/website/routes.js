import express from "express";
import global from "../../../../helpers/global-functions.js";
import authRoutes from "./auth/routes.js";
import userProfileRoutes from "./userProfile/routes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/user-profile", global.isLoggedIn, global.isRestaurant, userProfileRoutes);

export default router;
