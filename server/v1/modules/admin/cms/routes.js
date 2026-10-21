import express from "express";
const router = express.Router();
import cmsController from "./controller.js";
import cmsValidator from "./validator.js";

router.post("/add", cmsValidator.save, cmsController.save);

router.get("/details", cmsValidator.details, cmsController.details);

router.post("/edit", cmsValidator.edit, cmsController.edit);

router.post("/list", cmsController.list);

router.post("/change-status", cmsValidator.changeStatus, cmsController.changeStatus);

router.post("/delete", cmsValidator.delete, cmsController.delete);

export default router ;
