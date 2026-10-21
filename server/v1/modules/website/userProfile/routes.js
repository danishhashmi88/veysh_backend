

import express from "express";
const router = express.Router();

import routeController from "./controller.js";
import routeValidator from "./validator.js";

router.get("/details", routeController.userDetails);
router.post('/edit', routeValidator.editUser, routeController.editUser);
router.post("/update-password" , routeValidator.updatePassword , routeController.updatePassword);

export default router