// hoangnhat2004/book-store-management-backend/book-store-management-backend-b65cc36d05661fcf23898464f45f3f2fa510ea65/src/orders/order.route.js
const express = require('express');
const { 
  createAOrder, 
  getOrderByEmail,
  getAllOrders,
  confirmOrderPayment // <-- 1. IMPORT HÀM MỚI
} = require('./order.controller');
const verifyAdminToken = require('../middleware/verifyAdminToken');
const Order = require('./order.model');

const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');

const router = express.Router();

const verifyStaffToken = require('../middleware/verifyStaffToken');

// Tạo đơn
router.post("/", verifyFirebaseToken, createAOrder);

// Lấy theo email
router.get("/email/:email", verifyFirebaseToken, getOrderByEmail);

// LẤY TẤT CẢ (ADMIN)
router.get("/", verifyStaffToken, getAllOrders);

// --- 2. THÊM ROUTE MỚI ---
// Xác nhận thanh toán (sau khi VNPay return, dự phòng cho IPN)
router.post("/:id/confirm-payment", verifyFirebaseToken, confirmOrderPayment);
// --- KẾT THÚC THÊM ---

// CẬP NHẬT STATUS (ADMIN)
router.put("/:id/status", verifyStaffToken, async (req, res) => {
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