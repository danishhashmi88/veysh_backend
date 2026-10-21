import express from "express";
const router = express.Router();
import IapTransactionController from "./controller.js";
import IapTransactionValidator from "./validator.js";

// GET  /v1/admin/iapTransactionManagement/details?o_id=<id>
router.get("/details", IapTransactionValidator.details, IapTransactionController.details);

// POST /v1/admin/iapTransactionManagement/list
router.post("/list", IapTransactionController.list);

export default router;
