import Category from "../models/category.js";
import Product from "../models/product.js";


// geting Categories in another word  the list all categories 

export const getCategories = async (req, res) => {
  try {

    //  count using aggregation   
    // group all products by category and
    // then count them

    const counts = await Product.aggregate([
      {
        $group: {
          _id: "$category",              // group products by category ID
          productCount: { $sum: 1 },     // count how many products per category
        },
      },
    ]);


    // Convert array into a Map for fast lookup
    // So we can do: countMap.get(categoryId)
    const countMap = new Map(
      counts.map((c) => [c._id.toString(), c.productCount])
    );

    const categories = await Category.find().sort({ name: 1 });

    const result = categories.map((c) => ({
      categoryId: c._id,
      name: c.name,
      productCount: countMap.get(c._id.toString()) || 0,
    }));

    res.json({
      success: true,
      data: result,
      message: "Categories fetched successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// createCategory and subcategory under it if parentCategory exists
// otherwise it becomes a root category (parentCategory = null)

export const createCategory = async (req, res) => {
  try {
    const { name } = req.body;

    //making sure that all the attributes(just name and parent are required) 
    // of the category are entered
    if (!name)
      return res.status(400).json({
        success: false,
        message: "Category name is required.",
      });

    const category = await Category.create({
      name,
    });

    res.status(201).json({
      success: true,
      data: {
        categoryId: category._id,
        name: category.name,
        productCount: 0, //new category still no product under it 
      },
      message: "Category created successfully",
    });
  } catch (err) {

    // Handle duplicate key error (unique: true)
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category name already exists.",
      });
    }

    res.status(500).json({ success: false, message: err.message });
  }
};


// updateCategory

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const category = await Category.findById(id);

    //if category not found return error message 
    if (!category)
      return res.status(404).json({
        success: false,
        message: `Category ${id} not found.`,
      });

    if (name) category.name = name;

    await category.save();

    res.json({
      success: true,
      data: {
        categoryId: category._id,
        name: category.name,
      },
      message: "Category updated successfully",
    });
  } catch (err) {

    // Handle duplicate key error (unique: true)
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Category name already exists.",
      });
    }

    res.status(500).json({ success: false, message: err.message });
  }
};


// delete category  under very  strict conditions function

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Category ${id} not found.`,
      });
    }

    // checking if any product exists in this category
    const hasProducts = await Product.exists({ category: id });

    if (hasProducts) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete category with products. Please reassign products first.",
      });
    }

    // delete category
    await Category.findByIdAndDelete(id);

    return res.json({
      success: true,
      data: { categoryId: id },
      message: "Category deleted successfully.",
    });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
