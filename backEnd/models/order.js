import mongoose from "mongoose";

// ─── SUB-SCHEMA: each line item in the order ──────────────────────────────────
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product reference is required"],
    },

    productName: {
      // snapshot at time of order (product may be renamed/deleted later)
      type: String,
      required: true,
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },

    unitCost: {
      // cost price at time of order
      type: Number,
      required: [true, "Unit cost is required"],
      min: [0, "Unit cost cannot be negative"],
    },

    subtotal: {
      // unitCost × quantity — stored to avoid recalculation
      type: Number,
      required: true,
    },

  },
  { _id: false }
);

// ─── MAIN ORDER SCHEMA ────────────────────────────────────────────────────────
const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      // auto-generated e.g. "ORD-20260405-001"
      type: String,
      unique: true,
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: [true, "Supplier is required"],
    },

    supplierName: {
      // snapshot — supplier may be deleted later
      type: String,
      required: true,
    },

    items: {
      type: [orderItemSchema],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "An order must have at least one item",
      },
    },

    totalAmount: {
      // sum of all item subtotals
      type: Number,
      required: true,
      min: [0, "Total amount cannot be negative"],
    },

    status: {
      type: String,
      enum: ["pending", "received", "cancelled"],
      default: "pending",
    },

    expectedDelivery: {
      type: Date,
      default: null,
    },

    receivedAt: {
      // set when status becomes "received"
      type: Date,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// ─── PRE-SAVE HOOK: auto-generate orderNumber ─────────────────────────────────
orderSchema.pre("save", async function (next) {
  if (!this.isNew) return next();

  try {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ""); // "20260405"

    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const count = await mongoose.model("Order").countDocuments({
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    this.orderNumber = `ORD-${dateStr}-${String(count + 1).padStart(3, "0")}`;
    next();
  } catch (err) {
    next(err);
  }
});

// ─── VIRTUAL: check if order is overdue ──────────────────────────────────────
orderSchema.virtual("isOverdue").get(function () {
  if (!this.expectedDelivery) return false;
  const isPending =
    this.status === "pending" || this.status === "partially_received";
  return isPending && new Date() > this.expectedDelivery;
});

// ─── VIRTUAL: total items count ──────────────────────────────────────────────
orderSchema.virtual("totalItems").get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// ─── INDEXES ──────────────────────────────────────────────────────────────────
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ supplier: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ expectedDelivery: 1 });

orderSchema.set("toJSON", { virtuals: true });
orderSchema.set("toObject", { virtuals: true });

export default mongoose.model("Order", orderSchema);