import express from "express";
const router = express.Router();
import SubscriptionController from "./controller.js";
import SubscriptionValidator from "./validator.js";

router.post("/add", SubscriptionValidator.save, SubscriptionController.save);

router.get("/details", SubscriptionValidator.details, SubscriptionController.details);
router.post("/list", SubscriptionController.list);
router.put("/edit", SubscriptionValidator.edit, SubscriptionController.edit);
router.post("/change-status", SubscriptionValidator.changeStatus, SubscriptionController.changeStatus);
router.post("/delete", SubscriptionValidator.delete, SubscriptionController.delete);

export default router ;
