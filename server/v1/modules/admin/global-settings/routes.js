import express from "express";
const router = express.Router();
import gsController from "./controller.js";
import gsValidator from "./validator.js";

router.post("/add", gsValidator.save, gsController.save); /**add Global Settings */

router.get("/details", gsController.details); /**view Global Settings */

export default router ;