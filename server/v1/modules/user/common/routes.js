import express from "express";
const router = express.Router();
import CommonController from "./controller.js";
import CommonValidator from "./validator.js";
import global from "../../../../../helpers/global-functions.js";

router.post("/contact-query", CommonValidator.contactQuery, CommonController.contactQuery);
router.get("/rent-items-list", CommonController.rentList);
router.get("/rent-items-details", CommonValidator.rentDetails, CommonController.rentDetails);
router.post("/remove-item-bg", CommonController.removeBgItemPicture);
router.post("/remove-bg-and-tag", global.isLoggedIn, CommonController.removeBgAndAutoTag);

export default router;
