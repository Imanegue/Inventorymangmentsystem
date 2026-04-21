// controllers/brandController.js

import Brand from "../models/Brand.js";
import Product from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteFromCloudinary } from "../utils/cloudinaryHelper.js";

//======================================================================================
// ─ GET ALL BRANDS ─
//======================================================================================

export const getBrands = asyncHandler(async (req, res) => {
  const { search, isActive, page = 1, limit = 10 } = req.query;

  const filter = {};

  if (search) filter.$text = { $search: search };
  filter.isActive = isActive !== undefined ? isActive === "true" : true;

  const skip = (Number(page) - 1) * Number(limit);

  const [brands, total] = await Promise.all([
    Brand.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),

    Brand.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    total,
    count: brands.length,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data: brands,
  });
});

//======================================================================================
// ─ GET SINGLE BRAND ─
//======================================================================================

export const getBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findById(req.params.id);

  if (!brand) {
    const error = new Error("Brand not found");
    error.statusCode = 404;
    throw error;
  }

  // ── Count products under this brand ─────────────────────────────────────────
  const productCount = await Product.countDocuments({
    brand: req.params.id,
    isActive: true,
  });

  res.status(200).json({
    success: true,
    data: { ...brand.toJSON(), productCount },
  });
});

//======================================================================================
// ─ CREATE BRAND ─
//======================================================================================

export const createBrand = asyncHandler(async (req, res) => {
  const uploadedPublicId = null;

  try {
    // ── Check duplicate name ───────────────────────────────────────────────────
    const nameExists = await Brand.findOne({
      name: { $regex: `^${req.body.name}$`, $options: "i" },
    });

    if (nameExists) {
      const error = new Error("A brand with this name already exists");
      error.statusCode = 409;
      throw error;
    }

    // ── Handle logo upload ─────────────────────────────────────────────────────
    let logo = { url: null, public_id: null };

    if (req.file) {
      logo = {
        url:       req.file.path,     // CloudinaryStorage sets URL here
        public_id: req.file.filename, // and public_id here
      };
    }

    const brand = await Brand.create({
      name: req.body.name,
      logo,
    });

    res.status(201).json({
      success: true,
      data: brand,
    });

  } catch (err) {
    // ── Clean up uploaded logo if brand creation fails ─────────────────────────
    if (uploadedPublicId) {
      await deleteFromCloudinary(uploadedPublicId).catch(() => {});
    }
    throw err;
  }
});

//======================================================================================
// ─ UPDATE BRAND ─
//======================================================================================

export const updateBrand = asyncHandler(async (req, res) => {
  let newPublicId = null;

  try {
    const brand = await Brand.findById(req.params.id);

    if (!brand) {
      const error = new Error("Brand not found");
      error.statusCode = 404;
      throw error;
    }

    // ── Check duplicate name (exclude current brand) ───────────────────────────
    if (req.body.name) {
      const nameExists = await Brand.findOne({
        name: { $regex: `^${req.body.name}$`, $options: "i" },
        _id: { $ne: req.params.id },
      });

      if (nameExists) {
        const error = new Error("A brand with this name already exists");
        error.statusCode = 409;
        throw error;
      }

      brand.name = req.body.name;
    }

    // ── Replace logo if a new file was uploaded ────────────────────────────────
    if (req.file) {
      // Delete old logo from Cloudinary first
      if (brand.logo?.public_id) {
        await deleteFromCloudinary(brand.logo.public_id).catch(() => {});
      }

      newPublicId = req.file.filename;

      brand.logo = {
        url:       req.file.path,
        public_id: req.file.filename,
      };
    }

    // ── Remove logo if explicitly requested ───────────────────────────────────
    if (req.body.removeLogo === "true" && brand.logo?.public_id) {
      await deleteFromCloudinary(brand.logo.public_id).catch(() => {});
      brand.logo = { url: null, public_id: null };
    }

    await brand.save();

    res.status(200).json({
      success: true,
      data: brand,
    });

  } catch (err) {
    // ── Clean up new logo upload if update fails ───────────────────────────────
    if (newPublicId) {
      await deleteFromCloudinary(newPublicId).catch(() => {});
    }
    throw err;
  }
});

//======================================================================================
// ─ DELETE BRAND (soft delete) ─
//======================================================================================

export const deleteBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!brand) {
    const error = new Error("Brand not found");
    error.statusCode = 404;
    throw error;
  }

  // ── Detach brand from their products ──────────────────────────────────────
  await Product.updateMany(
    { brand: req.params.id },
    { $set: { brand: null } }
  );

  res.status(200).json({
    success: true,
    message: "Brand deactivated and detached from products successfully",
    data: brand,
  });
});

//======================================================================================
// ─ RESTORE BRAND ─
//======================================================================================

export const restoreBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findByIdAndUpdate(
    req.params.id,
    { isActive: true },
    { new: true }
  );

  if (!brand) {
    const error = new Error("Brand not found");
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    message: "Brand restored successfully",
    data: brand,
  });
});