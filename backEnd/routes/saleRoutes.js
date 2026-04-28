import express from "express";
import {
  getSales,
  getSale,
  createSale,
  deleteSale,
} from "../controllers/saleController.js";

const router = express.Router();

router.get("/",       getSales);
router.get("/:id",    getSale);
router.post("/",      createSale);
router.delete("/:id", deleteSale);

export default router;