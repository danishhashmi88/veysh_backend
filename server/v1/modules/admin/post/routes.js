import express from "express";
const router = express.Router();
import PostController from "./controller.js";

router.get("/details/:id", PostController.details);

router.post("/list", PostController.list);

router.post("/delete/:id",  PostController.delete);

export default router ;
