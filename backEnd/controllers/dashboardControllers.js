import Product from "../models/Product.js";
import Sale from "../models/Sale.js";
import Category from "../models/Category.js";

// ─── 1. TOTAL PRODUCTS ────────────────────────────────────────────────────────
export const getTotalProducts = async (req, res, next) => {
  try {
    const totalProducts = await Product.countDocuments({ isActive: true }); cc

    res.status(200).json({
      success: true,
      data: { totalProducts },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2. LOW STOCK COUNT ───────────────────────────────────────────────────────
export const getLowStockCount = async (req, res, next) => {
  try {
    const lowStockProducts = await Product.find({ isActive: true })
      .select("name sku stock")
      .lean();
    const lowStock = lowStockProducts.filter(
      (p) => p.stock.quantity <= p.stock.lowStockThreshold
    );

    res.status(200).json({
      success: true,
      data: {
        lowStockCount: lowStock.length,
        products: lowStock, // useful to show which products are low
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 3. TOTAL SALES ───────────────────────────────────────────────────────────
export const getTotalSales = async (req, res, next) => {
  try {
    const result = await Sale.aggregate([
      { $match: { status: "completed" } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          totalSalesCount: { $sum: 1 },
        },
      },
    ]);

    const totalRevenue = result[0]?.totalRevenue || 0;
    const totalSalesCount = result[0]?.totalSalesCount || 0;

    res.status(200).json({
      success: true,
      data: { totalRevenue, totalSalesCount },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 4. ALL STATS COMBINED (single request for dashboard) ────────────────────
export const getStats = async (req, res, next) => {
  try {
    // Run all queries in parallel for performance
    const [totalProducts, salesResult, allProducts, totalCategories] =
      await Promise.all([
        Product.countDocuments({ isActive: true }),
        Sale.aggregate([
          { $match: { status: "completed" } },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: "$totalAmount" },
              totalSalesCount: { $sum: 1 },
            },
          },
        ]),
        Product.find({ isActive: true }).select("stock").lean(),
        Category.countDocuments({ isActive: true }),
      ]);

    // Low stock filter
    const lowStockCount = allProducts.filter(
      (p) => p.stock.quantity <= p.stock.lowStockThreshold
    ).length;

    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        totalCategories,
        totalRevenue: salesResult[0]?.totalRevenue || 0,
        totalSalesCount: salesResult[0]?.totalSalesCount || 0,
        lowStockCount,
      },
    });
  } catch (error) {
    next(error);
  }
};