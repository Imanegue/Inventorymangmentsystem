import mongoose from "mongoose";
import { generateSKU } from "../utils/skuGenerator.js";

// ─── IMAGE SUB-SCHEMA ─────────────────────────────────────────────────────────
const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    public_id: {
      type: String,
      required: true,
    },
    altText: {
      type: String,
      trim: true,
      default: "",
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

// ─── MAIN PRODUCT SCHEMA ─────────────────────────────────────────────────────
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

    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      default: null,
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


    images: {
      type: [imageSchema],
      default: [],
      validate: {
        validator: function (arr) {
          return arr.length <= 5;
        },
        message: "A product cannot have more than 5 images",
      },
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);


// ─── PRE-SAVE HOOKS ───────────────────────────────────────────────────────────

// ─── PRE-SAVE HOOKS ───────────────────────────────────────────────────────────

// ✅ Validate sellingPrice >= costPrice
productSchema.pre("save", async function () {
  if (!this.price) return;

  const costPrice = Number(this.price.costPrice);
  const sellingPrice = Number(this.price.sellingPrice);

  if (Number.isNaN(costPrice) || Number.isNaN(sellingPrice)) {
    throw new Error("Invalid price values");
  }

  if (sellingPrice < costPrice) {
    throw new Error("Selling price must be greater than or equal to cost price");
  }
});

// ✅ Auto-generate SKU if not provided
productSchema.pre("save", async function () {
  if (this.sku) return;
  this.sku = await generateSKU(this.name, this.category);
});

// ✅ Ensure exactly one primary image
productSchema.pre("save", async function () {
  if (!Array.isArray(this.images) || this.images.length === 0) return;

  const primaryIndex = this.images.findIndex((img) => img.isPrimary);
  const targetIndex = primaryIndex === -1 ? 0 : primaryIndex;

  this.images.forEach((img, i) => {
    img.isPrimary = i === targetIndex;
  });
});

// ─── VIRTUALS ─────────────────────────────────────────────────────────────────
productSchema.virtual("profitMargin").get(function () {
  const { costPrice, sellingPrice } = this.price;
  if (!costPrice || costPrice === 0) return 0;
  return Number((((sellingPrice - costPrice) / costPrice) * 100).toFixed(2));
});

productSchema.virtual("isLowStock").get(function () {
  return this.stock.quantity <= this.stock.lowStockThreshold;
});

productSchema.virtual("isOverStock").get(function () {
  return this.stock.quantity >= this.stock.lowStockThreshold * 5;
});

// Returns the primary image URL directly — no lookup needed in controllers
productSchema.virtual("primaryImage").get(function () {
  if (!this.images?.length) return null;
  return this.images.find((img) => img.isPrimary)?.url ?? this.images[0].url;
});

// ─── INDEXES ──────────────────────────────────────────────────────────────────
productSchema.index({ name: "text", sku: "text" });
productSchema.index({ brand: 1 });
productSchema.index({ category: 1 });
productSchema.index({ "stock.quantity": 1 });
productSchema.index({ isActive: 1 });

productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });



const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

export default Product;