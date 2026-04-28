import express from "express";
import {
  createorder,
  getorders,
  getorder,
  receiveorder,
  deleteorder,
  updateorder,
} from "../controllers/orderController.js";


const router = express.Router();

// create new order
router.post("/orders", createorder);
// get all orders
router.get("/orders", getorders);
// get single order
router.get("/orders/:id", getorder);
// update order 
router.put("/orders/:id", updateorder);
// mark order as received + update stock
router.patch("/orders/:id/receive", receiveorder);
// delete order 
router.delete("/orders/:id", deleteorder);

export default router;
