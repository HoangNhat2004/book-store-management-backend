const express = require('express');
const { 
  createAOrder, 
  getOrderByEmail,
  getAllOrders 
} = require('./order.controller');
const verifyAdminToken = require('../middleware/verifyAdminToken');
const Order = require('./order.model');

const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');

const router = express.Router();

// Tạo đơn
router.post("/", verifyFirebaseToken, createAOrder);

// Lấy theo email
router.get("/email/:email", verifyFirebaseToken, getOrderByEmail);

// LẤY TẤT CẢ (ADMIN)
router.get("/", verifyAdminToken, getAllOrders);

// CẬP NHẬT STATUS (ADMIN)
router.put("/:id/status", verifyAdminToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.status(200).json({
      message: "Order status updated successfully",
      order: updatedOrder
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Failed to update order status" });
  }
});

module.exports = router;