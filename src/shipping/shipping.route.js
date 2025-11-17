// Tệp: src/shipping/shipping.route.js

const express = require('express');
// 1. Import các hàm mới
const { 
    calculateFee, 
    getProvinces, 
    getDistricts, 
    getWards 
} = require('./shipping.controller');

const router = express.Router();

// API tính phí (Đã có)
router.post("/calculate-fee", calculateFee);

// === BẮT ĐẦU THÊM ROUTE MỚI ===

// API lấy Tỉnh/Thành
router.get("/provinces", getProvinces);

// API lấy Quận/Huyện (Dùng POST để gửi body)
router.post("/districts", getDistricts);

// API lấy Phường/Xã (Dùng POST để gửi body)
router.post("/wards", getWards);

// === KẾT THÚC THÊM ROUTE MỚI ===

module.exports = router;