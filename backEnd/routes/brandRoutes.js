import express from "express";
import {
  getBrands,
  getBrand,
  createBrand,
  updateBrand,
  deleteBrand,
  restoreBrand,
} from "../controllers/brandController.js";
import { upload } from "../config/multer.js";

const router = express.Router();

router.get("/",                 getBrands);
router.get("/:id",              getBrand);
router.post("/",                upload.single("logo"), createBrand);
router.put("/:id",              upload.single("logo"), updateBrand);
router.delete("/:id",           deleteBrand);
router.patch("/:id/restore",    restoreBrand);

export default router;