// src/shipping/shipping.route.js
const express = require('express');
const verifyStaffToken = require('../middleware/verifyStaffToken'); // Middleware bảo vệ

// Import ĐẦY ĐỦ các hàm từ controller
const { 
    calculateFee, 
    getProvinces, 
    getDistricts, 
    getWards,
    createShippingOrder // <--- Hàm này mới thêm
} = require('./shipping.controller');

const router = express.Router();

// --- Public Routes (Cho trang Checkout) ---
router.post("/calculate-fee", calculateFee);
router.get("/provinces", getProvinces);
router.post("/districts", getDistricts);
router.post("/wards", getWards);

// --- Protected Routes (Cho Employee/Admin) ---
// Chỉ nhân viên mới được tạo đơn ship
router.post("/create-order", verifyStaffToken, createShippingOrder);

module.exports = router;