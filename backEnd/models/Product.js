import mongoose from "mongoose";
import { generateSKU } from "../utils/skuGenerator.js";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    sku: {
      type: String,
      unique: true,
      trim: true,
      uppercase: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },

    price: {
      costPrice: {
        type: Number,
        required: [true, "Cost price is required"],
        min: [0, "Cost price cannot be negative"],
      },
      sellingPrice: {
        type: Number,
        required: [true, "Selling price is required"],
        min: [0, "Selling price cannot be negative"],
      },
    },

    stock: {
      quantity: {
        type: Number,
        required: true,
        default: 0,
        min: [0, "Stock quantity cannot be negative"],
      },
      lowStockThreshold: {
        type: Number,
        default: 10,
        min: [0, "Threshold cannot be negative"],
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ─── PRE-SAVE HOOK ────────────────────────────────────────────────────────────
productSchema.pre("save", async function (next) {
  if (this.sku) return next(); // skip if manually provided or already set
  try {
    this.sku = await generateSKU(this.name, this.category);
    next();
  } catch (err) {
    next(err);
  }
});

// ─── VIRTUALS ─────────────────────────────────────────────────────────────────
productSchema.virtual("profitMargin").get(function () {
  const { costPrice, sellingPrice } = this.price;
  if (!costPrice || costPrice === 0) return 0;
  return (((sellingPrice - costPrice) / costPrice) * 100).toFixed(2);
});

productSchema.virtual("isLowStock").get(function () {
  return this.stock.quantity <= this.stock.lowStockThreshold;
});

productSchema.virtual("isOverStock").get(function () {
  return this.stock.quantity >= this.stock.lowStockThreshold * 5;
});

// ─── INDEXES ──────────────────────────────────────────────────────────────────
productSchema.index({ name: "text", sku: "text" });
productSchema.index({ category: 1 });
productSchema.index({ "stock.quantity": 1 });
productSchema.index({ isActive: 1 });

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

export default mongoose.model("Product", productSchema); 