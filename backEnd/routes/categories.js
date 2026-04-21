import express from "express";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryControllers.js";

const router = express.Router();

//get all categories
router.get("/", getCategories);
//create category
router.post("/", createCategory);
//update category
router.put("/:id", updateCategory);
//DELETE category
router.delete("/:id", deleteCategory);

export default router;
