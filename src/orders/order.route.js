// src/orders/order.route.js
const express = require('express');
const { 
  createAOrder, 
  getOrderByEmail,
  getAllOrders,
  confirmOrderPayment
} = require('./order.controller');

const verifyAdminToken = require('../middleware/verifyAdminToken');
const verifyToken = require('../middleware/verifyToken');
const verifyStaffToken = require('../middleware/verifyStaffToken'); 
const Order = require('./order.model');
const Book = require('../books/book.model'); 

const router = express.Router();

// --- 1. ĐỊNH NGHĨA LUỒNG TRẠNG THÁI HỢP LỆ ---
const ALLOWED_TRANSITIONS = {
    'Pending': ['Processing', 'Cancelled'],
    'Processing': ['Shipped', 'Cancelled'],
    'Shipped': ['Delivered', 'Cancelled'],
    'Delivered': [], // Đã giao thì chốt sổ, không đổi nữa
    'Cancelled': ['Pending', 'Processing'] // Cho phép khôi phục đơn
};
// ---------------------------------------------

router.post("/", verifyToken, createAOrder);
router.get("/email/:email", verifyToken, getOrderByEmail);
router.get("/", verifyStaffToken, getAllOrders);
router.post("/:id/confirm-payment", verifyToken, confirmOrderPayment);

// CẬP NHẬT TRẠNG THÁI (CÓ RÀNG BUỘC LOGIC)
router.put("/:id/status", verifyStaffToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status: newStatus } = req.body;

    // 1. Tìm đơn hàng cũ
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // --- THÊM ĐOẠN NÀY: CHẶN CHUYỂN TAY SANG SHIPPED ---
    if (newStatus === 'Shipped' && !order.ghnOrderCode) {
        return res.status(400).json({ 
            message: "Cannot change to Shipped manually. Please use 'Ship (GHN)' button to create a shipping order first." 
        });
    }
    // --------------------------------------------------

    // 2. KIỂM TRA LOGIC CHUYỂN ĐỔI (Giữ nguyên code cũ)
    const ALLOWED_TRANSITIONS = {
        'Pending': ['Processing', 'Cancelled'],
        'Processing': ['Shipped', 'Cancelled'], // Vẫn cho phép Shipped, nhưng bị chặn bởi if ở trên nếu thiếu mã
        'Shipped': ['Delivered', 'Cancelled'],
        'Delivered': [],
        'Cancelled': ['Pending', 'Processing']
    };

    const allowedNextSteps = ALLOWED_TRANSITIONS[order.status];
    if (!allowedNextSteps.includes(newStatus) && newStatus !== order.status) {
        return res.status(400).json({ 
            message: `Invalid transition: Cannot change from '${order.status}' to '${newStatus}'` 
        });
    }
    // ---------------------------

    // 3. Xử lý Kho (Hoàn kho/Trừ kho) - Giữ nguyên logic cũ
    try {
        if (newStatus === 'Cancelled' && order.status !== 'Cancelled') {
            for (const item of order.items) {
                await Book.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } });
            }
        }
        else if (order.status === 'Cancelled' && newStatus !== 'Cancelled') {
             for (const item of order.items) {
                await Book.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } });
            }
        }
    } catch (err) {
        console.error("Stock update error:", err);
    }

    // 4. Lưu thay đổi
    order.status = newStatus;
    await order.save();

    res.status(200).json({
      message: "Order status updated successfully",
      order: order
    });

  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ message: "Failed to update order status" });
  }
});

module.exports = router;