import express from "express";
const router = express.Router();
import OutfitController from "./controller.js";
import OutfitValidator from "./validator.js";

router.post("/add", OutfitValidator.save, OutfitController.save);

router.get("/details", OutfitValidator.details, OutfitController.details);
router.post("/shareOnFeed/:outfitId", OutfitController.shareOnFeed);
router.post("/list", OutfitController.list);
router.post("/list2", OutfitController.list2);
router.put("/edit", OutfitValidator.edit, OutfitController.edit);
router.put("/enable-rent-outfit", OutfitValidator.enableRentByOutfitId, OutfitController.enableRentByOutfitId);

router.post("/delete", OutfitValidator.delete, OutfitController.delete);


router.post("/ask-question", OutfitController.askWardrobeQuestion);
router.post("/chat-history", OutfitController.getChatHistory);
router.get("/default-questions", OutfitController.getDefaultQuestions);
router.post("/save-suggested", OutfitController.saveSuggested);

export default router;
