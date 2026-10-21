import express from "express";
const router = express.Router();
import reportedPostsController from "./controller.js";
import reportedPostsValidator from "./validator.js";

router.get("/details", reportedPostsValidator.details, reportedPostsController.details);
router.post("/list", reportedPostsController.list);
router.post("/delete", reportedPostsValidator.delete, reportedPostsController.delete);

export default router;
