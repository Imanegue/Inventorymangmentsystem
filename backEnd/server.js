import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import mongoose from "mongoose";
import userRoutes from "./routes/userRoutes.js";

const PORT = process.env.PORT || 3000;

// Routes
app.use("/api/users", userRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// 404 handler - AFTER routes
app.use((req, res, next) => {
  next(new Error("Route not found"));
});

// Global error handler - MUST be last, MUST have 4 params
app.use((err, req, res, next) => {
  console.error("GLOBAL ERROR:", err);
  res.status(500).json({ success: false, message: err.message });
});

// DB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });