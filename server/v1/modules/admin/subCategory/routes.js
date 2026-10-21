import express from "express";
const router = express.Router();
import subCategoryController from "./controller.js";
import subCategoryValidator from "./validator.js";

router.post("/add", subCategoryValidator.save, subCategoryController.save);

router.get("/details", subCategoryValidator.details, subCategoryController.details);

router.post("/list", subCategoryController.list);

router.post("/category-list", subCategoryController.categoryList);

router.put("/edit", subCategoryValidator.edit, subCategoryController.edit);

router.post("/change-status", subCategoryValidator.changeStatus, subCategoryController.changeStatus);

router.post("/delete", subCategoryValidator.delete, subCategoryController.delete);

export default router ;
