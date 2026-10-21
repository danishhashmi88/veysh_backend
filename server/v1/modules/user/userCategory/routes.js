import express from "express";
const router = express.Router();
import UserCategoryController from "./controller.js";
import global from "../../../../../helpers/global-functions.js";


router.post("/list", global.isLoggedIn, UserCategoryController.list);
router.post("/listOutfit", global.isLoggedIn, UserCategoryController.outfitList);

export default router;
