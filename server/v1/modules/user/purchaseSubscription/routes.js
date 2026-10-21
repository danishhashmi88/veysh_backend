import express from "express";
const router = express.Router();
import PurchaseController from "./controller.js";
import PurchaseValidator from "./validator.js";

router.get("/active",             PurchaseController.getActiveSubscription);
router.post("/list",              PurchaseController.subscriptionList);
router.post("/save-subscription", PurchaseController.saveSubscription);
router.post("/cancel",            PurchaseValidator.cancelSubscription, PurchaseController.cancelSubscription);
router.post("/restore",           PurchaseController.restoreSubscription);

export default router;
