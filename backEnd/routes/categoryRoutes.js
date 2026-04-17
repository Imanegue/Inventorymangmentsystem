import express from "express";
import { createCategory } from "../controllers/categoryControllers.js";


const router = express.Router();

router.post("/", createCategory);

export default router;