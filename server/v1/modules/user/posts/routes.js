import express from "express";
const router = express.Router();
import PostsController from "./controller.js";
import PostsValidator from "./validator.js";

router.post("/add", PostsValidator.save, PostsController.save);

router.get("/details", PostsValidator.details, PostsController.details);
router.post("/list", PostsController.list);
router.post("/latest-posts", PostsController.allPosts);
router.put("/edit", PostsValidator.edit, PostsController.edit);
router.post("/like/:postId", PostsController.likeUnlikePost);
router.post("/comment/:postId", PostsController.addComment);
router.post("/comment-list/:postId", PostsController.commentList);
router.post("/like-list/:postId", PostsController.likeList);
router.post("/delete", PostsValidator.delete, PostsController.delete);
router.post("/report", PostsController.reportPost);

export default router;
