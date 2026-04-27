import mongoose from "mongoose";

// ─── SAFE PREFIX HELPER ─────────────────────────────────────────────
function toPrefix(value = "") {
  return String(value)
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 3)
    .toUpperCase();
}

// ─── MAIN SKU GENERATOR ─────────────────────────────────────────────
// Format: CAT-PRO-0001
export async function generateSKU(productName, categoryId) {
  try {
    // ─── VALIDATE INPUTS ───────────────────────────────
    if (!productName) {
      throw new Error("Product name is required for SKU generation");
    }

    // ─── GET CATEGORY ───────────────────────────────────
    let categoryPrefix = "GEN";

    if (categoryId) {
      const category = await mongoose
        .model("Category")
        .findById(categoryId)
        .lean();

      if (category?.name) {
        categoryPrefix = toPrefix(category.name);
      }
    }

    const namePrefix = toPrefix(productName);
    const skuBase = `${categoryPrefix}-${namePrefix}`;

    // ─── GENERATE UNIQUE COUNTER ───────────────────────
    const MAX_RETRIES = 5;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const lastProduct = await mongoose
        .model("Product")
        .findOne({
          sku: new RegExp(`^${skuBase}-\\d{4}$`),
        })
        .sort({ sku: -1 })
        .lean();

      let nextCounter = 1;

      if (lastProduct?.sku) {
        const lastNumber = parseInt(lastProduct.sku.split("-").pop(), 10);
        if (!isNaN(lastNumber)) {
          nextCounter = lastNumber + 1;
        }
      }

      if (nextCounter > 9999) {
        throw new Error(
          `SKU limit reached (9999) for base "${skuBase}"`
        );
      }

      const counter = String(nextCounter).padStart(4, "0");
      const sku = `${skuBase}-${counter}`;

      // check collision
      const exists = await mongoose.model("Product").exists({ sku });

      if (!exists) {
        return sku;
      }
    }

    // ─── FALLBACK (last safety net) ─────────────────────
    return `${skuBase}-${Date.now().toString().slice(-4)}`;
  } catch (err) {
    console.error("SKU GENERATOR ERROR:", err.message);

    // fallback so product creation NEVER breaks
    const fallbackBase = toPrefix(productName || "PRD");
    return `${fallbackBase}-ERR-${Date.now().toString().slice(-4)}`;
  }
}