export const errorHandler = (err, req, res, next) => {
  // ─── LOG ERROR (IMPORTANT FOR DEBUGGING) ────────────────
  console.error("🔥 ERROR MESSAGE:", err.message);
  console.error("🔥 ERROR STACK:", err.stack);
  console.log("FULL ERROR OBJECT:", err);

  // ─── MongoDB duplicate key error ───────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];

    return res.status(409).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // ─── Mongoose validation error ──────────────────────────
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map(
      (e) => e.message
    );

    return res.status(400).json({
      success: false,
      message: messages,
    });
  }

  // ─── CastError (invalid ObjectId) ───────────────────────
  if (err.name === "CastError") {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
    });
  }

  // ─── JWT error (optional) ───────────────────────────────
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  // ─── Default server error ───────────────────────────────
  return res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
    // ⚠️ remove stack in production
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};