import express from "express";
import cors from "cors";
import { errorHandler } from "./middleware/errorHandler.js";
import orderRoutes from "./routes/orderRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import brandRoutes from "./routes/brandRoutes.js";
import categoriersRoutes from "./routes/categoryRoutes.js";
import supplierRoutes from "./routes/supplierRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import aiInsights from "./routes/aiRoutes.js";
import saleRoutes from "./routes/saleRoutes.js";

const app = express();


// ─── CORE MIDDLEWARES ─────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── ROUTES ───────────────────────────────────
app.use("/api/products", productRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/categories", categoriersRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/users",userRoutes)
app.use("/api/dashboard", dashboardRoutes); 
app.use("/api/aiInsights",aiInsights)
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

