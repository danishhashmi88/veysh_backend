import express from "express";
const router = express.Router();
import contactController from "./controller.js";
import contactValidator from "./validator.js";

// router.post("/add", contactValidator.save, contactController.save);

router.get("/details", contactValidator.details, contactController.details);

router.post("/list", contactController.list);

// router.post("/edit", contactValidator.edit, contactController.edit);

// router.post("/change-status", contactValidator.changeStatus, contactController.changeStatus);

router.post("/delete", contactValidator.delete, contactController.delete);

export default router ;
