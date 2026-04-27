import Product from "../models/Product.js";
import Sale from "../models/Sale.js";

// ─── 1. getAlerts() — Low stock & overstock alerts ───────────────────────────
export const getAlerts = async (req, res, next) => {
  try {
    const products = await Product.find({ isActive: true })
      .select("name sku stock price images")
      .lean();

    const lowStock = [];
    const overStock = [];

    products.forEach((p) => {
      const { quantity, lowStockThreshold } = p.stock;
      const threshold = Math.min(lowStockThreshold, 5);

      if (quantity <= threshold) {
        lowStock.push({
          _id: p._id,
          name: p.name,
          sku: p.sku,
          quantity,
          threshold,
          status: quantity === 0 ? "out_of_stock" : "low_stock",
        });
      } else if (quantity >= lowStockThreshold * 5) {
        overStock.push({
          _id: p._id,
          name: p.name,
          sku: p.sku,
          quantity,
          threshold,
          status: "overstock",
        });
      }
    });

    res.status(200).json({
      success: true,
      data: {
        lowStockCount: lowStock.length,
        overStockCount: overStock.length,
        lowStock,
        overStock,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 2. getTopProducts() — Best & slow moving products ───────────────────────
export const getTopProducts = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const topProducts = await Sale.aggregate([
      // only completed sales in last 30 days
      {
        $match: {
          status: "completed",
          createdAt: { $gte: thirtyDaysAgo },
        },
      },

      // flatten items array
      { $unwind: "$items" },

      // group by product
      {
        $group: {
          _id: "$items.product",
          productName: { $first: "$items.productName" },
          totalQuantitySold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.subtotal" },
          totalOrders: { $sum: 1 },
        },
      },

      // sort by quantity sold
      { $sort: { totalQuantitySold: -1 } },

      // get product stock info
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },

      // shape the output
      {
        $project: {
          _id: 1,
          productName: 1,
          totalQuantitySold: 1,
          totalRevenue: 1,
          totalOrders: 1,
          currentStock: "$productInfo.stock.quantity",
          sku: "$productInfo.sku",
        },
      },
    ]);

    // split into best and slow movers
    const bestSellers = topProducts.slice(0, 5);
    const slowMovers = [...topProducts].reverse().slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        period: "last 30 days",
        bestSellers,
        slowMovers,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── 3. getForecast() — Predict next month's best sellers ────────────────────
export const getForecast = async (req, res, next) => {
  try {
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // get sales for last 60 days split into 2 periods of 30 days
    const salesData = await Sale.aggregate([
      {
        $match: {
          status: "completed",
          createdAt: { $gte: sixtyDaysAgo },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: {
            product: "$items.product",
            // split into period 1 (older) and period 2 (recent)
            period: {
              $cond: [
                { $gte: ["$createdAt", thirtyDaysAgo] },
                "recent",   // last 30 days
                "previous", // 30-60 days ago
              ],
            },
          },
          productName: { $first: "$items.productName" },
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.subtotal" },
        },
      },
      {
        $group: {
          _id: "$_id.product",
          productName: { $first: "$productName" },
          periods: {
            $push: {
              period: "$_id.period",
              totalQuantity: "$totalQuantity",
              totalRevenue: "$totalRevenue",
            },
          },
        },
      },

      // get current stock
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
    ]);

    // calculate growth and forecast
    const forecast = salesData.map((item) => {
      const recent = item.periods.find((p) => p.period === "recent");
      const previous = item.periods.find((p) => p.period === "previous");

      const recentQty = recent?.totalQuantity || 0;
      const previousQty = previous?.totalQuantity || 0;

      // growth rate calculation
      const growthRate =
        previousQty === 0
          ? 100 // new product — assume 100% growth
          : Number((((recentQty - previousQty) / previousQty) * 100).toFixed(2));

      // predicted next month = recent * (1 + growthRate/100)
      const predictedNextMonth = Math.round(recentQty * (1 + growthRate / 100));

      const currentStock = item.productInfo?.stock?.quantity || 0;

      // will stock cover next month demand?
      const stockSufficient = currentStock >= predictedNextMonth;

      return {
        _id: item._id,
        productName: item.productName,
        sku: item.productInfo?.sku,
        recentQty,
        previousQty,
        growthRate,
        predictedNextMonth,
        currentStock,
        stockSufficient,
        recommendation: stockSufficient
          ? "✅ Stock is sufficient"
          : `⚠️ Restock needed — predicted demand: ${predictedNextMonth}, current stock: ${currentStock}`,
      };
    });

    // sort by predicted demand
    forecast.sort((a, b) => b.predictedNextMonth - a.predictedNextMonth);

    res.status(200).json({
      success: true,
      data: {
        generatedAt: new Date(),
        forecast,
      },
    });
  } catch (error) {
    next(error);
  }
};