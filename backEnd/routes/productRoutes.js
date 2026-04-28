import express from "express";
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  restoreProduct,
  deleteProduct,
} from "../controllers/productController.js";
import { upload } from "../config/multer.js";


const router = express.Router();


router.get("/", getProducts);
router.get("/:id", getProduct);
router.post("/", upload.array("images", 5), createProduct);
router.put("/:id", upload.array("images", 5), updateProduct);
router.patch("/:id", restoreProduct);   
router.delete("/:id", deleteProduct);

export default router;