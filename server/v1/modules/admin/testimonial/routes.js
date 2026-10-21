import express from "express";
const router = express.Router();
import testimonialController from "./controller.js";
import testimonialValidator from "./validator.js";

router.post("/add", testimonialValidator.save, testimonialController.save);

router.post("/edit", testimonialValidator.editUser, testimonialController.editUser);

router.post("/edit-profile", testimonialValidator.editProfile, testimonialController.editProfile);

router.post("/change-password", testimonialValidator.changePassword, testimonialController.changePassword);

router.post("/list", testimonialController.list);

router.post("/list-by-ids", testimonialController.listByIds);

router.get("/details", testimonialValidator.details, testimonialController.details);

router.post("/change-status", testimonialValidator.changeStatus, testimonialController.changeStatus);

router.post("/delete", testimonialValidator.delete, testimonialController.delete);

export default router
