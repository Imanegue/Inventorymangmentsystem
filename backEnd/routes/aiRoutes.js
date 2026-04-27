import express from "express";
import {
  getAlerts,
  getTopProducts,
  getForecast,
} from "../controllers/aiController.js";
const router = express.Router(); 

// ─── AI INSIGHTS ──────────────────────────────────────────────────────────────
router.get("/alerts", getAlerts);
router.get("/top-products", getTopProducts);
router.get("/forecast", getForecast);

export default router;