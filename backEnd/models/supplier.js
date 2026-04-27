import mongoose from "mongoose";

const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Supplier name is required"],
      trim: true,
      maxlength: [100, "Supplier name cannot exceed 100 characters"],
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
      
    },

    phone: {
      type: String,
      trim: true,
      maxlength: [20, "Phone number cannot exceed 20 characters"],
      unique: true,
    },

    address: {
      type: String,
      trim: true,
      maxlength: [300, "Address cannot exceed 300 characters"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    note: {
      type: String,
      trim: true,
      maxlength: [300, "Note cannot exceed 300 characters"],
    },
  },
  { timestamps: true }
);

// ─── VIRTUAL: list products supplied by this supplier ─────────────────────────
supplierSchema.virtual("products", {
  ref: "Product",
  localField: "_id",
  foreignField: "supplier",
});

supplierSchema.index({ name: "text", email: "text" });
supplierSchema.index({ email: 1 }, { unique: true, sparse: true });
supplierSchema.index({ isActive: 1 });

supplierSchema.set("toJSON", { virtuals: true });
supplierSchema.set("toObject", { virtuals: true });

export default mongoose.model("Supplier", supplierSchema);