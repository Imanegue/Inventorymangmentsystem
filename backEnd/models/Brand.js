import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Brand name is required"],
      unique: true,
      trim: true,
      maxlength: [50, "Brand name cannot exceed 50 characters"],
    },

    logo: {
      url:       { type: String, default: null },
      public_id: { type: String, default: null }, // ← needed for Cloudinary deletion
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

brandSchema.index({ name: "text" });
brandSchema.index({ isActive: 1 });

export default mongoose.model("Brand", brandSchema);