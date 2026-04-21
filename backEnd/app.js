import express from "express";
import cors from "cors";
import { errorHandler } from "./middleware/errorHandler.js";
import orderRoutes from "./routes/orders.js";
import productRoutes from "./routes/productRoutes.js";
import brandRoutes from "./routes/brandRoutes.js";
import categoryRoutes from "./routes/categoryRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import saleRoutes from "./routes/saleRoutes.js";

const app = express();

// ─── CORE MIDDLEWARES ─────────────────────────
app.use(cors());
app.use(express.json());

// ─── ROUTES ───────────────────────────────────
app.use("/api/products", productRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/order", orderRoutes);


// ─── ERROR HANDLER ────────────────────────────
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorHandler);

export default app;

