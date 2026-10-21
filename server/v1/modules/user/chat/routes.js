import express from "express";
import global from "../../../../../helpers/global-functions.js";
import chatController from "./controller.js";
import chatValidator from "./validator.js";

const router = express.Router();

router.post("/list", global.isLoggedIn, chatController.chatList);
router.get("/messages", global.isLoggedIn, chatValidator.getMessages, chatController.getMessages);
router.get("/receiver-info", global.isLoggedIn, chatValidator.receiverInfo, chatController.receiverInfo);
router.post("/upload-file", global.isLoggedIn, chatController.uploadFile);
router.post("/delete-message", global.isLoggedIn, chatValidator.deleteMessage, chatController.deleteMessage);
router.post("/edit-message", global.isLoggedIn, chatValidator.editMessage, chatController.editMessage);
router.post("/clear-chat", global.isLoggedIn, chatValidator.clearChat, chatController.clearChat);
// router.post("/voice-to-text", global.isLoggedIn, chatController.voiceToText);
// router.post("/auto-item-tagging", global.isLoggedIn, chatController.autoImageTagging);

export default router;
