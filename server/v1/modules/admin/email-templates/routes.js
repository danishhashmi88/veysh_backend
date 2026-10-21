import express from "express";
const router = express.Router();
import emailTempController from "./controller.js";
import emailTempValidator from "./validator.js";

router.post("/add", emailTempValidator.save, emailTempController.save);

router.get("/details", emailTempValidator.details, emailTempController.details);

router.post("/edit", emailTempValidator.edit, emailTempController.edit);

router.post("/list", emailTempController.list);

router.post("/change-status", emailTempValidator.changeStatus, emailTempController.changeStatus);

router.post("/delete", emailTempValidator.deleteRecord, emailTempController.deleteRecord);

router.post("/options", emailTempController.options);

router.post("/send-test-email", emailTempValidator.sendTestEmail, emailTempController.sendTestEmail);

export default router;
