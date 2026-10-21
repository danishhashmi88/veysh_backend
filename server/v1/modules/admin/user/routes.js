import express from "express";
const router = express.Router();
import userController from "./controller.js";
import userValidator from "./validator.js";

router.post("/edit-profile", userValidator.editProfile, userController.editProfile);
router.post("/change-password", userValidator.changePassword, userController.changePassword);
router.get("/details", userValidator.details, userController.details);
router.post("/delete", userValidator.delete, userController.delete);

router.post("/chat-list", userValidator.chatList, userController.chatList);
router.get("/get-messages", userValidator.getMessages, userController.getMessages);
router.post("/messages-delete", userValidator.messagesDelete, userController.messagesDelete);


router.post("/remove-background", userController.removeBackground);

router.post("/remove-background-poof", userController.removeBackgroundPoof);

router.post("/remove-background-photoroom", userController.removeBackgroundPhotoroom);



export default router;
