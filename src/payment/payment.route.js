const express = require('express');
const { createPaymentUrl, vnpayIpn, vnpayReturn } = require('./payment.controller');

const router = express.Router();

// Frontend gọi API này để lấy URL thanh toán VNPay
router.post("/create-payment-url", createPaymentUrl);

// VNPay gọi API này (IPN) để thông báo kết quả thanh toán (server-to-server)
router.get("/vnpay-ipn", vnpayIpn);

// VNPay chuyển hướng người dùng về URL này sau khi thanh toán
router.get("/vnpay-return", vnpayReturn);

module.exports = router;