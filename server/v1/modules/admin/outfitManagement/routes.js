import express from "express";
const router = express.Router();
import outfitManagementController from "./controller.js";
import outfitManagementValidator from "./validator.js";


router.get("/details", outfitManagementValidator.details, outfitManagementController.details);
router.post("/change-status", outfitManagementValidator.changeStatus, outfitManagementController.changeStatus);
router.post("/list", outfitManagementController.list);
router.post("/delete", outfitManagementValidator.delete, outfitManagementController.delete);

export default router;
