import Sale from "../models/Sale.js";
import Product from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";

//======================================================================================
// ─ SALE NUMBER GENERATOR  
//======================================================================================

const generateSaleNumber = async () => {
  const today    = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
  const prefix   = `SALE-${datePart}`;

  const lastSale = await Sale.findOne({
    saleNumber: new RegExp(`^${prefix}-\\d{3}$`),
  })
    .sort({ saleNumber: -1 })
    .lean();

  let nextCounter = 1;

  if (lastSale?.saleNumber) {
    const lastNumber = parseInt(lastSale.saleNumber.split("-").pop(), 10);
    if (!isNaN(lastNumber)) nextCounter = lastNumber + 1;
  }

  if (nextCounter > 999) {
    throw new Error("Daily sale limit reached (999)");
  }

  return `${prefix}-${String(nextCounter).padStart(3, "0")}`;
};

//======================================================================================
// ─ GET ALL SALES ─
//======================================================================================

export const getSales = asyncHandler(async (req, res) => {
  const {
    status,
    startDate,
    endDate,
    page  = 1,
    limit = 10,
  } = req.query;

  const filter = {};

  if (status) filter.status = status;

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate)   filter.createdAt.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [sales, total] = await Promise.all([
    Sale.find(filter)
      .populate("items.product", "name sku")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 }),

    Sale.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    total,
    count: sales.length,
    page:  Number(page),
    pages: Math.ceil(total / Number(limit)),
    data:  sales,
  });
});

//======================================================================================
// ─ GET SINGLE SALE ─
//======================================================================================

export const getSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id)
    .populate("items.product", "name sku images");

  if (!sale) {
    const error = new Error("Sale not found");
    error.statusCode = 404;
    throw error;
  }

  res.status(200).json({
    success: true,
    data: sale,
  });
});

//======================================================================================
// ─ CREATE SALE  (auto reduces stock) ─
//======================================================================================

export const createSale = asyncHandler(async (req, res) => {
  const { items } = req.body;

  // ── Basic validation ─────────────────────────────────────────────────────────
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("A sale must have at least one item");
    error.statusCode = 400;
    throw error;
  }

  // ── Fetch all products in one query ──────────────────────────────────────────
  const productIds = items.map((i) => i.product);
  const products   = await Product.find({ _id: { $in: productIds }, isActive: true });

  // ── Index products by id for quick lookup ────────────────────────────────────
  const productMap = new Map(products.map((p) => [p._id.toString(), p]));

  // ── Validate each item & build sale items ────────────────────────────────────
  const saleItems   = [];
  let   totalAmount = 0;

  for (const item of items) {
    const product = productMap.get(item.product?.toString());

    if (!product) {
      const error = new Error(`Product not found or inactive: ${item.product}`);
      error.statusCode = 404;
      throw error;
    }

    const quantity = Number(item.quantity);

    if (!quantity || quantity < 1) {
      const error = new Error(`Invalid quantity for product: ${product.name}`);
      error.statusCode = 400;
      throw error;
    }

    // ── Stock check ──────────────────────────────────────────────────────────
    if (product.stock.quantity < quantity) {
      const error = new Error(
        `Insufficient stock for "${product.name}". Available: ${product.stock.quantity}, requested: ${quantity}`
      );
      error.statusCode = 400;
      throw error;
    }

    const unitPrice = product.price.sellingPrice;
    const subtotal  = unitPrice * quantity;
    totalAmount    += subtotal;

    saleItems.push({
      product:     product._id,
      productName: product.name,
      quantity,
      unitPrice,
      subtotal,
    });
  }

  // ── Deduct stock atomically for each product ─────────────────────────────────
  await Promise.all(
    saleItems.map((item) =>
      Product.findByIdAndUpdate(item.product, {
        $inc: { "stock.quantity": -item.quantity },
      })
    )
  );

  // ── Create sale ──────────────────────────────────────────────────────────────
  const saleNumber = await generateSaleNumber();

  const sale = await Sale.create({
    saleNumber,
    items:      saleItems,
    totalAmount,
    status:     "completed",
  });

  const populatedSale = await Sale.findById(sale._id)
    .populate("items.product", "name sku");

  res.status(201).json({
    success: true,
    data: populatedSale,
  });
});

//======================================================================================
// ─ DELETE SALE  (cancel + revert stock) ─
//======================================================================================

export const deleteSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id);

  if (!sale) {
    const error = new Error("Sale not found");
    error.statusCode = 404;
    throw error;
  }

  // ── Prevent double-cancellation ──────────────────────────────────────────────
  if (sale.status === "cancelled") {
    const error = new Error("Sale is already cancelled");
    error.statusCode = 400;
    throw error;
  }

  // ── Revert stock for each item ───────────────────────────────────────────────
  await Promise.all(
    sale.items.map((item) =>
      Product.findByIdAndUpdate(item.product, {
        $inc: { "stock.quantity": item.quantity },
      })
    )
  );

  // ── Mark as cancelled ────────────────────────────────────────────────────────
  sale.status = "cancelled";
  await sale.save();

  res.status(200).json({
    success: true,
    message: "Sale cancelled and stock reverted successfully",
    data: sale,
  });
});