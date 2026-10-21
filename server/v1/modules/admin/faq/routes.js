import express from "express";
const router = express.Router();
import FaqController from "./controller.js";
import faqValidator from "./validator.js";

router.post("/add", faqValidator.save, FaqController.save);

router.get("/details", faqValidator.details, FaqController.details);

router.post("/list", FaqController.list);

router.post("/edit", faqValidator.edit, FaqController.edit);

router.post("/change-status", faqValidator.changeStatus, FaqController.changeStatus);

router.post("/delete", faqValidator.delete, FaqController.delete);

export default router ;
