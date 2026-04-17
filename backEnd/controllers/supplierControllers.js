import Supplier from "../models/Supplier.js";
import Product from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//======================================================================================
// ─ GET ALL SUPPLIERS ─
//======================================================================================

export const getSuppliers = asyncHandler(async (req, res) => {
  const { search, isActive, page = 1, limit = 10 } = req.query;

  const filter = {};

  if (search) filter.$text = { $search: search };
  filter.isActive = isActive !== undefined ? isActive === "true" : true;

  const skip = (Number(page) - 1) * Number(limit);

  const [suppliers, total] = await Promise.all([
    Supplier.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),

    Supplier.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    total,
    count: suppliers.length,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    data: suppliers,
  });
});

//======================================================================================
// ─ GET SINGLE SUPPLIER ─
//======================================================================================

export const getSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id).populate(
    "products",
    "name sku price stock isActive"
  );

  if (!supplier) {
    const error = new Error("Supplier not found");
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    data: supplier,
  });
});

//======================================================================================
// ─ CREATE SUPPLIER ─
//======================================================================================

export const createSupplier = asyncHandler(async (req, res) => {
  const { name, email, phone, address, note } = req.body;

  // ── Check duplicate email ────────────────────────────────────────────────────
  if (email) {
    const emailExists = await Supplier.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      const error = new Error("A supplier with this email already exists");
      error.statusCode = 409;
      throw error;
    }
  }

  const supplier = await Supplier.create({
    name,
    email,
    phone,
    address,
    note,
  });

  res.status(201).json({
    success: true,
    data: supplier,
  });
});

//======================================================================================
// ─ UPDATE SUPPLIER ─
//======================================================================================

export const updateSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);

  if (!supplier) {
    const error = new Error("Supplier not found");
    error.statusCode = 404;
    throw error;
  }

  // ── Check duplicate email if email is being changed ──────────────────────────
  if (req.body.email) {
    const normalized = req.body.email.toLowerCase();
    const emailExists = await Supplier.findOne({
      email: normalized,
      _id: { $ne: req.params.id }, // exclude current supplier
    });

    if (emailExists) {
      const error = new Error("A supplier with this email already exists");
      error.statusCode = 409;
      throw error;
    }
  }

  const ALLOWED_FIELDS = ["name", "email", "phone", "address", "note"];

  ALLOWED_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) {
      supplier[field] = req.body[field];
    }
  });

  await supplier.save();

  res.status(200).json({
    success: true,
    data: supplier,
  });
});

//======================================================================================
// ─ DELETE SUPPLIER (soft delete) ─
//======================================================================================

export const deleteSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!supplier) {
    const error = new Error("Supplier not found");
    error.statusCode = 404;
    throw error;
  }

  // ── Detach supplier from their products ──────────────────────────────────────
  await Product.updateMany(
    { supplier: req.params.id },
    { $set: { supplier: null } }
  );

  res.status(200).json({
    success: true,
    message: "Supplier deactivated and detached from products successfully",
    data: supplier,
  });
});

//======================================================================================
// ─ RESTORE SUPPLIER ─
//======================================================================================

export const restoreSupplier = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByIdAndUpdate(
    req.params.id,
    { isActive: true },
    { new: true }
  );

  if (!supplier) {
    const error = new Error("Supplier not found");
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    message: "Supplier restored successfully",
    data: supplier,
  });
});