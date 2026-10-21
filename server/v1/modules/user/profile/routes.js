import express from "express";
const router = express.Router();
import authController from "./controller.js";
import authValidator from "./validator.js";
import global from "../../../../../helpers/global-functions.js";



router.post("/save-basic-profile", global.isLoggedIn, authValidator.saveProfile, authController.saveBasicProfile);
router.post("/save-preferences", global.isLoggedIn, authController.savePreferences);
router.post("/save-sizeInfo", global.isLoggedIn, authController.saveSizeInfo);
router.post("/save-appearance", global.isLoggedIn, authController.saveAppearance);
router.post("/save-saveStyleInfo", global.isLoggedIn, authController.saveStyleInfo);
router.post("/save-privacy-settings", global.isLoggedIn, authController.savePrivacySettings);
router.post("/goals-list", global.isLoggedIn, authController.goalList);



router.put("/edit-basic-profile", global.isLoggedIn, authValidator.editProfile, authController.updateMyProfile);
router.put("/edit-preferences", global.isLoggedIn, authController.updateStyleAndAppearance);
router.put("/edit-styleInfo", global.isLoggedIn, authController.updateStyleInfo);
router.put("/edit-privacy-settings", global.isLoggedIn, authController.updatePrivacySettings);


router.get("/user-details", global.isLoggedIn, authValidator.userDetails, authController.userDetails);
router.get("/profile-completion", global.isLoggedIn, authController.getProfileCompletion);
router.post("/all-users", global.isLoggedIn, authController.getAllUsers);
router.get("/search-users", global.isLoggedIn, authController.searchUsers);
router.post("/block-user", global.isLoggedIn, authController.blockUser);
router.post("/unblock-user", global.isLoggedIn, authController.unblockUser);
router.get("/blocked-users", global.isLoggedIn, authController.getBlockedUsers);
router.get("/followers", global.isLoggedIn, authController.getFollowers);
router.get("/following", global.isLoggedIn, authController.getFollowing);
router.post("/follow-user", global.isLoggedIn, authController.followUser);
router.post("/unfollow-user", global.isLoggedIn, authController.unfollowUser);
router.delete("/delete-account", global.isLoggedIn, authController.deleteAccount);

router.post('/change-password', global.isLoggedIn, authValidator.changePassword, authController.changePassword);


export default router;
