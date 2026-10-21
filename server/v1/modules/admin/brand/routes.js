import express from "express";
const router = express.Router();
import BrandController from "./controller.js";
import BrandValidator from "./validator.js";

router.post("/add", BrandValidator.save, BrandController.save);

router.get("/details", BrandValidator.details, BrandController.details);

router.post("/list", BrandController.list);

router.put("/edit", BrandValidator.edit, BrandController.edit);
router.post("/change-status", BrandValidator.changeStatus, BrandController.changeStatus);

router.post("/delete", BrandValidator.delete, BrandController.delete);

export default router;