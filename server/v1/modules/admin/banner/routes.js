import express from "express";
const router = express.Router();
import bannerController from "./controller.js";
import bannervalidator from "./validator.js";

router.post("/add", bannervalidator.save, bannerController.save);

router.get("/details", bannervalidator.details, bannerController.details);

router.post("/list", bannerController.list);

router.post("/edit", bannervalidator.edit, bannerController.edit);

router.post("/change-status", bannervalidator.changeStatus, bannerController.changeStatus);

router.post("/delete", bannervalidator.delete, bannerController.delete);

export default router ;
