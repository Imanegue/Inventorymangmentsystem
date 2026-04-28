import mongoose from "mongoose";

// ─── SUB-SCHEMA: each line item in the sale ──────────────────────────────────
const saleItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product reference is required"],
    },

    productName: {
      // snapshot at time of sale (in case product is later renamed/deleted)
      type: String,
      required: true,
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },

    unitPrice: {
      // selling price at time of sale (price may change later)
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price cannot be negative"],
    },

    subtotal: {
      // unitPrice × quantity — stored to avoid recalculation
      type: Number,
      required: true,
    },
  },
  { _id: false } // no separate _id for sub-documents
);

// ─── MAIN SALE SCHEMA ─────────────────────────────────────────────────────────
const saleSchema = new mongoose.Schema(
  {
    saleNumber: {
      // auto-generated readable reference e.g. "SALE-20240601-001"
      type: String,
      unique: true,
    },

    items: {
      type: [saleItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "A sale must have at least one item",
      },
    },

    totalAmount: {
      // sum of all subtotals — stored for quick dashboard queries
      type: Number,
      required: true,
      min: [0, "Total amount cannot be negative"],
    },

    status: {
      type: String,
      enum: ["completed", "cancelled"],
      default: "completed",
    },

  },
  {
    timestamps: true,
  }
);

// ─── INDEX: speed up date-range and status queries ───────────────────────────
saleSchema.index({ createdAt: -1 });
saleSchema.index({ status: 1 });
saleSchema.index({ "items.product": 1 }); // for AI: top products queries

const Sale =
  mongoose.models.Sale || mongoose.model("Sale", saleSchema);

export default Sale;