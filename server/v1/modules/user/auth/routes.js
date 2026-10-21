import express from "express";
const router = express.Router();
import authController from "./controller.js";
import authValidator from "./validator.js";
import global from "../../../../../helpers/global-functions.js";

router.post("/signup", authValidator.signUpWithEmail, authController.signUpWithEmail);

router.post("/verifyOTPWithEmail", authValidator.verifyOtpWithEmail, authController.verifyOtpWithEmail);

router.post("/login", authValidator.login, authController.login);

router.post("/google", authValidator.googleLogin, authController.googleLogin);

router.post("/apple", authValidator.appleLogin, authController.appleLogin);

router.post("/forget-password", authValidator.forgetPassword, authController.forgetPassword);

router.post("/resend-otp", authValidator.resendOtp, authController.resendOtp);

router.post("/reset-password", authValidator.resetPassword, authController.resetPassword);

router.post("/save-profile", global.isLoggedIn, authValidator.saveProfile, authController.saveProfile);

router.get("/user-details", global.isLoggedIn, authValidator.userDetails, authController.userDetails);

export default router;
