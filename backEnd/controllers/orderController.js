import Product from "../models/Product.js";


// creating the order and the orderitems under it 
export const createorder = async (req, res) => {
  try {
    const { items, supplier, supplierName, deliverydate } = req.body;

    if (!supplier || !supplierName)
      return res.status(400).json({
        success: false,
        message: "Supplier and supplierName are required.",
      });

    if (!items || !Array.isArray(items) || items.length === 0)
      return res.status(400).json({
        success: false,
        message: "items array is required.",
      });

    const missingProducts = [];
    const preparedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        //check product exist or no
        //notify the admin that he is adding a orderitem does not exist(new product)
        //  must create it first.
        missingProducts.push({
          productId: item.productId,
          message: "Product does not exist",
        });
        continue;
      }

      preparedItems.push({
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitprice: product.price.sellingPrice,
      });
    }

    const order = new Order({
      items: preparedItems,
      supplier,
      supplierName,
      deliverydate,
      state: "pending",
    });

    await order.save();

    res.status(201).json({
      success: true,
      data: {
        orderId: order._id,
        totalPrice: order.totalPrice,
        missingProducts,
      },
      message: "Order created successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



// get all orders 

export const getorders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: orders.map(o => ({
        orderId: o._id,
        orderDate: o.orderDate,
        totalPrice: o.totalPrice,
        state: o.state,
        supplierName: o.supplierName,
        deliverydate: o.deliverydate,
        receivedat: o.receivedat,

        // FIXED: correct variable + virtuals
        totalItems: o.totalItems,
        isOverdue: o.isOverdue,
      })),
      message: "Orders fetched successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



// get single order details(each order item info plus the order info)

export const getorder = async (req, res) => {
  try {
    const id = req.params.id;
    const order = await Order.findById(id);

    if (!order)
      // in case the order under that id get delted or does not exist 
      return res.status(404).json({
        success: false,
        message: `Order ${id} not found.`,
      });

    res.json({
      success: true,
      data: {
        orderId: order._id,
        orderDate: order.orderDate,
        totalPrice: order.totalPrice,
        state: order.state,
        supplier: order.supplier,
        supplierName: order.supplierName,
        deliverydate: order.deliverydate,
        receivedat: order.receivedat,
        items: order.items,

        // optional but consistent with getorders
        totalItems: order.totalItems,
        isOverdue: order.isOverdue,
      },
      message: "Order fetched successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



// change the state of order to receive + updating stock since the order is checked.

export const receiveorder = async (req, res) => {
  try {
    const id = req.params.id;
    const order = await Order.findById(id);

    if (!order)
      return res.status(404).json({
        success: false,
        message: `Order ${id} not found.`,
      });

    // make sure the order which are pending are only the one updated 
    if (order.state !== "pending")
      return res.status(400).json({
        success: false,
        message: `Order cannot be received since it is ${order.state}`,
      });

    const missingProducts = [];

    //validate ALL products ( do exist in the list) before doing anything
    for (const item of order.items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        missingProducts.push({
          productId: item.productId,
          productName: item.productName || "Unknown product",
          message: `The product "${item.productName || "Unknown"}" does not exist. Please create it first.`,
        });
      }
    }

    // if one product does not exist or missing  from the list of product STOP all means no stock update, no state change
    if (missingProducts.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Order cannot be received. Some products are missing.",
        missingProducts,
      });
    }

    //all products exist so update stock
    for (const item of order.items) {
      const product = await Product.findById(item.productId);
      product.stock.quantity += item.quantity;
      await product.save();
    }

    //update the order state from pending to received (all product exist)

    order.state = "received";
    order.receivedat = new Date();

    await order.save();

    res.json({
      success: true,
      data: {
        orderId: order._id,
        state: "received",
      },
      message: "Order received successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



// Delet order but only if it is still pending 
// to make sure keep history of old  received orders 

export const deleteorder = async (req, res) => {
  try {
    const id = req.params.id;
    const order = await Order.findById(id);

    if (!order)
      return res.status(404).json({
        success: false,
        message: `Order ${id} not found.`,
      });

    if (order.state === "received")
      return res.status(400).json({
        success: false,
        message: "Cannot delete a received order (frozen 🔒).",
      });

    await Order.findByIdAndDelete(id);

    res.json({
      success: true,
      data: { orderId: id },
      message: "Order deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};



// updating  but only PENDING ones.

export const updateorder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { items } = req.body;

    // order with no order items is not order
    if (!items || !Array.isArray(items))
      return res.status(400).json({
        success: false,
        message: "order items is required for the order to be valid",
      });

    const order = await Order.findById(orderId);

    // order not found in database
    if (!order)
      return res.status(404).json({
        success: false,
        message: `Order ${orderId} not found.`,
      });

    // order already received cannot be updated to protect the order history 
    if (order.state === "received")
      return res.status(400).json({
        success: false,
        message: "Order is already received and cannot be updated",
      });

    const missingProducts = [];
    const newItems = [];

    // validate products and build new order items
    for (const item of items) {
      const product = await Product.findById(item.productId);

      // product does not exist in database
      if (!product) {
        missingProducts.push({
          productId: item.productId,
          message: "Product does not exist pls create it",
        });
        continue;
      }

      // rebuild order item with latest changed product data
      newItems.push({
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitprice: product.price.sellingPrice,
      });
    }

    // update order items with new data we changed
    order.items = newItems;
    await order.save();

    // response with update result
    res.json({
      success: true,
      data: {
        orderId: order._id,
        totalPrice: order.totalPrice,
        missingProducts,
      },
      message: "Order updated successfully",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
