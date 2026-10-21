import express from "express";
const router = express.Router();
import customerController from "./controller.js";
import customerValidator from "./validator.js";


router.get("/details", customerValidator.details, customerController.details);
router.post("/change-status", customerValidator.changeStatus, customerController.changeStatus);
router.post("/list", customerController.list);
router.post("/delete", customerValidator.delete, customerController.delete);
router.post("/checkSubscription", customerController.checkSubscription);

export default router;
