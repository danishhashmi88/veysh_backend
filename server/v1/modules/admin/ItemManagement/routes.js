import express from "express";
const router = express.Router();
import itemManagementController from "./controller.js";
import itemManagementValidator from "./validator.js";


router.get("/details", itemManagementValidator.details, itemManagementController.details);
router.post("/change-status", itemManagementValidator.changeStatus, itemManagementController.changeStatus);
router.post("/list", itemManagementController.list);
router.post("/delete", itemManagementValidator.delete, itemManagementController.delete);

export default router;
