import express from "express";
const router = express.Router();
import routeController from "./controller.js";
import routeValidator from "./validator.js";
import AppleWebhookController from "./AppleWebhookController.js";
import GoogleWebhookController from "./GoogleWebhookController.js";

router.get('/global-settings' , routeController.details); 
router.get('/cms-page' , routeController.cmsPage);
router.get('/faq' , routeController.FAQList);
router.post('/contact-us' , routeValidator.contactUs ,routeController.saveContactUs);
router.post(
    "/apple/notifications",
    AppleWebhookController.notification
  );
  router.post(
    "/google/webhook",
    GoogleWebhookController.notification
  );

export default router;