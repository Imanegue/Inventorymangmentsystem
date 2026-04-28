import mongoose from "mongoose";
// each orderitem schem(each order is composed of orderitems)
const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  productName: {
    type: String,
    required: true,
  },
  sku: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  unitprice: {
    type: Number,
    required: true,
    min: 0,
  },
  totalCost: {
    type: Number,
    min: 0,
  },
});
// the schema of the order entity
const orderSchema = new mongoose.Schema(
  {
    orderDate: {
      type: Date,
      default: Date.now,
    },
    totalPrice: {
      type: Number,
      min: 0,
    },
    state: {
      type: String,
      enum: ["pending", "received"],
      default: "pending",
    },
    items: [orderItemSchema],
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: [true, "Supplier is required"],
    },
    supplierName: {
      type: String,
      required: true, 
    },

    deliverydate: {
      type: Date,
      default: null,
    },

    receivedat: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// ─── VIRTUAL: total items count ──────────────────────────────────────────────
orderSchema.virtual("totalItems").get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// ─── VIRTUAL: check if order is overdue ─────────────────────────────
orderSchema.virtual("isOverdue").get(function () {
  if (!this.expectedDelivery) return false;

  const isPending = this.state === "pending";

  return isPending && new Date() > this.expectedDelivery;
});

// ─── VIRTUAL: total items count ─────────────────────────────────────
orderSchema.virtual("totalItems").get(function () {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// ─── INDEXES ────────────────────────────────────────────────────────
orderSchema.index({ supplier: 1 });
orderSchema.index({ state: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ expectedDelivery: 1 });

// ─── ENABLE VIRTUALS IN RESPONSE ────────────────────────────────────
orderSchema.set("toJSON", { virtuals: true });
orderSchema.set("toObject", { virtuals: true });

const Order = mongoose.model("Order", orderSchema);
export default Order;
