import express from "express";
const router = express.Router();


import v1Routes from "../server/v1/routes.js"; 
router.use("/v1", v1Routes);

export default router;
