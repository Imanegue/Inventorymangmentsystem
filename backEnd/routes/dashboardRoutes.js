import express from "express";
import {
  getStats,
  getTotalProducts,
  getTotalSales,
  getLowStockCount,
} from "../controllers/dashboardController.js";

const router = express.Router();

// ─── DASHBOARD ROUTES ─────────────────────────────────────────────────────────
router.get("/stats", getStats);                    // all KPIs in one request
router.get("/total-products", getTotalProducts);   // total products only
router.get("/total-sales", getTotalSales);         // total sales only
router.get("/low-stock", getLowStockCount);        // low stock only

router.get("/ping", (req, res) => res.json({ message: "dashboard router works" }));

export default router;