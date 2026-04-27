import Product from "../models/Product.js";
import Category from "../models/Category.js";
import Supplier from "../models/Supplier.js";
import Brand from "../models/Brand.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary } from "../utils/cloudinaryHelper.js";

// ─── SAFE FIELD PARSER (handles string or object from multipart/form-data) ────
const parseField = (val) => {
  if (!val) return {};
  if (typeof val === "object") return val;
  try {
    return JSON.parse(val);
  } catch {
    return {};
  }
};

//======================================================================================
// ─ GET ALL PRODUCTS ─
//======================================================================================

export const getProducts = asyncHandler(async (req, res) => {
  const {
    search,
    category,
    brand,        
    isActive,
    lowStock,
    page = 1,
    limit = 10,
  } = req.query;

  const filter = {};

  if (search)   filter.$text    = { $search: search };
  if (category) filter.category = category;
  if (brand)    filter.brand    = brand;              

  filter.isActive = isActive !== undefined ? isActive === "true" : true;

  if (lowStock === "true") {
    filter.$expr = { $lte: ["$stock.quantity", "$stock.lowStockThreshold"] };
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    Product.find(filter)
      .populate("category", "name")
      .populate("supplier", "name")
      .populate("brand", "name logo")  
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),

    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    total,
    count: products.length,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data: products,
  });
});


//======================================================================================
// ─ GET SINGLE PRODUCT ─
//======================================================================================

export const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate("category", "name")
    .populate("supplier", "name")
    .populate("brand", "name logo");  

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    data: product,
  });
});


//======================================================================================
// ─ CREATE PRODUCT ─
//======================================================================================

export const createProduct = asyncHandler(async (req, res) => {
  const uploadedPublicIds = [];

  try {
    const rawPrice = parseField(req.body.price);
    const rawStock = parseField(req.body.stock);

    const price = {
      costPrice:    Number(rawPrice.costPrice),
      sellingPrice: Number(rawPrice.sellingPrice),
    };

    const stock = {
      quantity:          Number(rawStock.quantity),
      lowStockThreshold: Number(rawStock.lowStockThreshold ?? 10),
    };

    if (!price.costPrice || !price.sellingPrice) {
      const error = new Error("Invalid price values");
      error.statusCode = 400;
      throw error;
    }

    if (isNaN(stock.quantity) || stock.quantity < 0) {
      const error = new Error("Invalid stock quantity");
      error.statusCode = 400;
      throw error;
    }

    // ── Validate category ────────────────────────────────────────────────────────
    const categoryExists = await Category.findById(req.body.category);
    if (!categoryExists) {
      const error = new Error("Category not found");
      error.statusCode = 400;
      throw error;
    }

    // ── Validate supplier (optional) ─────────────────────────────────────────────
    if (req.body.supplier) {
      const supplierExists = await Supplier.findById(req.body.supplier);
      if (!supplierExists) {
        const error = new Error("Supplier not found");
        error.statusCode = 400;
        throw error;
      }
    }

    // ── Validate brand (optional) ─────────────────────────────────────────────── 
    if (req.body.brand) {
      const brandExists = await Brand.findById(req.body.brand);
      if (!brandExists) {
        const error = new Error("Brand not found");
        error.statusCode = 400;
        throw error;
      }
    }

    // ── Images ───────────────────────────────────────────────────────────────────
    const imageObjects = [];

    if (req.files?.length) {
      req.files.forEach((file, i) => {
        uploadedPublicIds.push(file.filename);

        imageObjects.push({
          url:       file.path,
          public_id: file.filename,
          altText:   req.body[`altText_${i}`] ?? "",
          isPrimary: i === 0,
        });
      });
    }

    // ── Create product ───────────────────────────────────────────────────────────
    const product = await Product.create({
      name:        req.body.name,
      description: req.body.description,
      brand:       req.body.brand    || null,   
      category:    req.body.category,
      supplier:    req.body.supplier || null,
      price,
      stock,
      images:      imageObjects,
      isActive:    req.body.isActive === "false" ? false : true,
    });

    const populatedProduct = await Product.findById(product._id)
      .populate("category", "name")
      .populate("supplier", "name email")
      .populate("brand", "name logo");          

    res.status(201).json({
      success: true,
      data: populatedProduct,
    });

  } catch (err) {
    if (uploadedPublicIds.length) {
      await Promise.allSettled(
        uploadedPublicIds.map((id) => deleteFromCloudinary(id))
      );
    }
    throw err;
  }
});


//======================================================================================
// ─ UPDATE PRODUCT ─
//======================================================================================

export const updateProduct = asyncHandler(async (req, res) => {
  const uploadedPublicIds = [];

  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      const error = new Error("Product not found");
      error.statusCode = 404;
      throw error;
    }

    // ── Validate brand if being changed ──────────────────────────────────────── 
    if (req.body.brand) {
      const brandExists = await Brand.findById(req.body.brand);
      if (!brandExists) {
        const error = new Error("Brand not found");
        error.statusCode = 400;
        throw error;
      }
    }

    // ── Remove images ────────────────────────────────────────────────────────────
    const removedImages = req.body.removedImages
      ? parseField(req.body.removedImages)
      : [];

    if (removedImages.length) {
      const imagesToDelete = product.images.filter((img) =>
        removedImages.includes(img.url)
      );

      await Promise.allSettled(
        imagesToDelete.map((img) => deleteFromCloudinary(img.public_id))
      );

      product.images = product.images.filter(
        (img) => !removedImages.includes(img.url)
      );
    }

    // ── Add new images ────────────────────────────────────────────────────────────
    if (req.files?.length) {
      const remaining = 5 - product.images.length;

      if (req.files.length > remaining) {
        const error = new Error(`You can only add ${remaining} more image(s)`);
        error.statusCode = 400;
        throw error;
      }

      req.files.forEach((file, i) => {
        uploadedPublicIds.push(file.filename);

        product.images.push({
          url:       file.path,
          public_id: file.filename,
          altText:   req.body[`altText_${i}`] ?? "",
          isPrimary: false,
        });
      });
    }

    // ── Update price ──────────────────────────────────────────────────────────────
    if (req.body.price) {
      const parsedPrice = parseField(req.body.price);
      product.price = {
        ...product.price.toObject(),
        ...parsedPrice,
      };
    }

    // ── Update stock ──────────────────────────────────────────────────────────────
    if (req.body.stock) {
      const parsedStock = parseField(req.body.stock);
      product.stock = {
        ...product.stock.toObject(),
        ...parsedStock,
      };
    }

    // ── Update scalar fields ──────────────────────────────────────────────────────
    const updatableFields = [
      "name",
      "description",
      "brand",      
      "category",
      "supplier",
      "isActive",
    ];

    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        if (field === "isActive") {
          product.isActive = req.body.isActive === "false" ? false : true;
        } else {
          product[field] = req.body[field];
        }
      }
    }

    await product.save();

    await product.populate([
      { path: "category", select: "name" },
      { path: "supplier", select: "name" },
      { path: "brand",    select: "name logo" },  
    ]);

    res.status(200).json({
      success: true,
      data: product,
    });

  } catch (err) {
    if (uploadedPublicIds.length) {
      await Promise.allSettled(
        uploadedPublicIds.map((id) => deleteFromCloudinary(id))
      );
    }
    throw err;
  }
});


//======================================================================================
// ─ DELETE PRODUCT (soft delete) ─
//======================================================================================

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  )
    .populate("category", "name")
    .populate("supplier", "name")
    .populate("brand", "name logo");   

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    message: "Product deactivated successfully",
    data: product,
  });
});


//======================================================================================
// ─ RESTORE PRODUCT ─
//======================================================================================

export const restoreProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isActive: true },
    { new: true }
  )
    .populate("category", "name")
    .populate("supplier", "name")
    .populate("brand", "name logo");   

  if (!product) {
    const error = new Error("Product not found");
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    message: "Product restored successfully",
    data: product,
  });
});