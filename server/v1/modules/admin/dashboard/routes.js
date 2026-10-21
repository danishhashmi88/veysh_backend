import express from "express";
const router = express.Router();
import dashboardController from "./controller.js";


router.get("/counts", dashboardController.getCount);

router.get("/event-registration/list", dashboardController.listForRecentEventRegistration);

router.get("/user-registration/list", dashboardController.listForRecentUserRegistration);

router.get("/users-overview", dashboardController.usersOverview);

router.get("/registrations-overview", dashboardController.registrationsOverview);

router.get("/revenue-overview", dashboardController.revenueOverview);

router.get("/items-outfits-overview", dashboardController.itemsOutfitsOverview);

export default router