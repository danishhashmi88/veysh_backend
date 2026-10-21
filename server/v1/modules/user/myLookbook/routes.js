import express from "express";
const router = express.Router();
import MyLookbookController from "./controller.js";
import myLookbookValidator from "./validator.js";
import global from "../../../../../helpers/global-functions.js";

router.post("/add", global.isLoggedIn, myLookbookValidator.addLookbook, MyLookbookController.addLookbook);
router.get("/list", global.isLoggedIn, MyLookbookController.getLookbook);
router.delete("/delete", global.isLoggedIn, myLookbookValidator.deleteLookbookItem, MyLookbookController.deleteLookbookItem);

export default router;
