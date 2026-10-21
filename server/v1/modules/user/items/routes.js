import express from "express";
const router = express.Router();
import ItemsController from "./controller.js";
import ItemsValidator from "./validator.js";

router.post("/add", ItemsValidator.save, ItemsController.save);
router.put("/edit-items", ItemsValidator.edit, ItemsController.edit);
router.put("/enable-rent-item", ItemsValidator.enableRentByItemId, ItemsController.enableRentByItemId);
router.post("/increment-wear-count", ItemsValidator.incrementWearCount, ItemsController.incrementWearCount);
router.get("/details", ItemsValidator.details, ItemsController.details);
router.post("/shareOnFeed/:itemId", ItemsController.shareOnFeed);
router.post("/list", ItemsController.list);
router.post("/delete", ItemsValidator.delete, ItemsController.delete);

export default router;
