import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
      maxlength: [20, "Category name cannot exceed 20 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

categorySchema.virtual("productCount", {
  ref: "Product",
  localField: "_id",
  foreignField: "category",
  count: true,
});

categorySchema.set("toJSON", { virtuals: true, versionKey: false });
categorySchema.set("toObject", { virtuals: true, versionKey: false });

const Category =
  mongoose.models.Category || mongoose.model("Category", categorySchema);

export default Category;