import express from "express";
const router = express.Router();
import CategoryController from "./controller.js";
import CategoryValidator from "./validator.js";

router.post("/add", CategoryValidator.save, CategoryController.save);

router.get("/details", CategoryValidator.details, CategoryController.details);

router.post("/list", CategoryController.list);

router.put("/edit", CategoryValidator.edit, CategoryController.edit);
router.post("/change-status", CategoryValidator.changeStatus, CategoryController.changeStatus);

router.post("/delete", CategoryValidator.delete, CategoryController.delete);

export default router ;
