import express from "express";
const router = express.Router();
import notificationSettingController from "./controller.js";
import notificationSettingValidator from "./validator.js";
import global from "../../../../../helpers/global-functions.js";

router.get('/get-notification-settings', global.isLoggedIn, notificationSettingController.getSettings);

router.put('/update-notification-settings', global.isLoggedIn, notificationSettingValidator.updateSettings, notificationSettingController.updateSettings);

router.get('/get-privacy-settings', global.isLoggedIn, notificationSettingController.getPrivacySettings);

router.put('/update-privacy-settings', global.isLoggedIn,  notificationSettingController.updatePrivacySettings);

router.get('/list', global.isLoggedIn, notificationSettingController.list);

router.put('/mark-all-read', global.isLoggedIn, notificationSettingController.markAllAsRead);

router.put('/mark-read/:id', global.isLoggedIn, notificationSettingController.markAsRead);

export default router