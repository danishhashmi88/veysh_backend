import express from "express";
const router = express.Router();
import routeController from "./controller.js";
import routeValidator from "./validator.js";

router.post("/login", routeValidator.login, routeController.login);

router.post('/forget-password', routeValidator.forgetPassword, routeController.forgetPassword);

router.post('/verify-otp', routeValidator.verifyOtp, routeController.verifyOtp)

router.post('/resend-otp', routeValidator.resendOtp, routeController.resendOtp);

router.post('/reset-password', routeValidator.resetPassword, routeController.resetPassword);

export default router;