import express from "express";
import profileRoutes from "./profile/routes.js";
import GlobalFunctions from "../../../../helpers/global-functions.js";
const router = express.Router();

router.use("/profile", GlobalFunctions.isLoggedIn, profileRoutes);

export default router;
