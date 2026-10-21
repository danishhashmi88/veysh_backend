import express from "express";
const router = express.Router();
import ProfileController from "./controller.js";
import profileValidator from "./validator.js";
import global from "../../../../../helpers/global-functions.js";

router.post("/save-basic-profile", global.isLoggedIn, profileValidator.saveBasicProfile, ProfileController.saveBasicProfile);

router.post("/create-portfolio", global.isLoggedIn, profileValidator.createPortfolio, ProfileController.createPortfolio);

router.post("/create-portfolio-service", global.isLoggedIn, profileValidator.createPortfolioService, ProfileController.createPortfolioService);
router.put("/edit-portfolio-service", global.isLoggedIn, profileValidator.editPortfolioService, ProfileController.editPortfolioService);
router.delete("/delete-portfolio-service", global.isLoggedIn, profileValidator.deletePortfolioService, ProfileController.deletePortfolioService);
router.get("/portfolio-services", global.isLoggedIn, ProfileController.getPortfolioServices);


router.post("/save-privacy-settings", global.isLoggedIn,  ProfileController.savePrivacySettings);


router.put("/edit-basic-profile", global.isLoggedIn, ProfileController.updateMyProfile);
router.put("/edit-privacy-settings", global.isLoggedIn, ProfileController.updatePrivacySettings);


router.get("/user-details", global.isLoggedIn, profileValidator.userDetails, ProfileController.userDetails);

export default router;
