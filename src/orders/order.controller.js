// backend/src/orders/order.controller.js
const Order = require("./order.model");

const createAOrder = async (req, res) => {
  try {
    const newOrder = new Order(req.body); // SỬA: new Order
    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (error) {
    console.error("Error creating order", error);
    res.status(500).json({ message: "Failed to create order" });
  }
};

const getOrderByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const orders = await Order.find({ email }).sort({ createdAt: -1 });
    if (!orders || orders.length === 0) {
      return res.status(404).json({ message: "No orders found" });
    }
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

// THÊM: LẤY TẤT CẢ ĐƠN HÀNG (ADMIN)
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch all orders" });
  }
};

module.exports = {
  createAOrder,
  getOrderByEmail,
  getAllOrders, // XUẤT RA
};