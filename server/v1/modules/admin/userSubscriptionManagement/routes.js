import express from "express";
const router = express.Router();
import UserSubscriptionController from "./controller.js";
import UserSubscriptionValidator from "./validator.js";

// GET  /v1/admin/userSubscriptionManagement/details?o_id=<id>
router.get("/details", UserSubscriptionValidator.details, UserSubscriptionController.details);

// POST /v1/admin/userSubscriptionManagement/list
router.post("/list", UserSubscriptionController.list);

export default router;
