// backend/src/orders/order.route.js
const express = require('express');
const { 
  createAOrder, 
  getOrderByEmail,
  getAllOrders 
} = require('./order.controller');
const verifyAdminToken = require('../middleware/verifyAdminToken');

const router = express.Router();

// Tạo đơn
router.post("/", createAOrder);

// Lấy theo email
router.get("/email/:email", getOrderByEmail);

// LẤY TẤT CẢ (ADMIN)
router.get("/", verifyAdminToken, getAllOrders);

module.exports = router;