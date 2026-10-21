import express from "express";
const router = express.Router();
import authController from "./controller.js";
import authValidator from "./validator.js";


router.post("/login", authValidator.login, authController.login);

router.post("/forget-password", authValidator.forgetPassword, authController.forgetPassword);

router.post("/verify-otp", authValidator.verifyOtp, authController.verifyOtp);

router.post("/resend-otp", authValidator.resendOtp, authController.resendOtp);

router.post("/invitation-info", authValidator.invitationInfo, authController.invitationInfo);

router.post("/complete-invitation", authValidator.completeInvitation, authController.completeInvitation);

router.post("/reset-password", authValidator.resetPassword, authController.resetPassword);

export default router;