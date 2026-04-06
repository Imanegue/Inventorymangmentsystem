import mongoose from "mongoose";

// ─── HELPER: sanitize a string into a 3-letter prefix ────────────────────────
function toPrefix(str) {
  return str
    .replace(/[^a-zA-Z0-9]/g, "") // remove spaces, dashes, special chars
    .substring(0, 3)
    .toUpperCase();
}

// ─── MAIN: generate a collision-safe unique SKU ───────────────────────────────
// Format: CAT-PRO-0001
//          ^^^  ^^^  ^^^^
//          │    │    └─ auto-increment (padded to 4 digits)
//          │    └─ first 3 letters of product name
//          └─ first 3 letters of category name

export async function generateSKU(productName, categoryId) {
  // 1. Fetch category name from DB
  const category = await mongoose
    .model("Category")
    .findById(categoryId)
    .lean();

  const categoryPrefix = category ? toPrefix(category.name) : "GEN";
  const namePrefix = toPrefix(productName);
  const skuBase = `${categoryPrefix}-${namePrefix}`;

  // 2. Retry loop — handles race conditions when two products are saved at the
  //    same time and would otherwise receive the same counter value
  const MAX_RETRIES = 5;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    // Find the highest existing SKU with this base
    const lastProduct = await mongoose
      .model("Product")
      .findOne({ sku: new RegExp(`^${skuBase}-\\d{4}$`) }) // strict: ends in exactly 4 digits
      .sort({ sku: -1 })
      .lean();

    let nextCounter = 1;
    if (lastProduct) {
      const lastNumber = parseInt(lastProduct.sku.split("-").pop(), 10);
      if (!isNaN(lastNumber)) nextCounter = lastNumber + 1;
    }

    if (nextCounter > 9999) {
      throw new Error(`SKU counter overflow for base "${skuBase}". Max 9999 products per prefix.`);
    }

    const counter = String(nextCounter).padStart(4, "0");
    const sku = `${skuBase}-${counter}`;

    // 3. Check the generated SKU isn't already taken (race condition guard)
    const exists = await mongoose.model("Product").exists({ sku });
    if (!exists) return sku; // ✅ safe to use
    
    // Collision detected → loop and try the next counter
  }

  // Fallback: if all retries fail, append a random suffix
  const fallback = `${skuBase}-${Date.now().toString().slice(-4)}`;
  return fallback;
}