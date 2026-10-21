import express from "express";
const router = express.Router();
import PlannerController from "./controller.js";
import PannerValidator from "./validator.js";

router.post("/add", PannerValidator.save, PlannerController.save);

router.get("/details", PannerValidator.details, PlannerController.details);

router.post("/list", PlannerController.list);
router.post("/todayOutfit",PlannerController.todayList)
router.put("/edit", PannerValidator.edit, PannerValidator.editItemIds, PlannerController.edit);

router.post("/delete", PannerValidator.delete, PlannerController.delete);

export default router ;
