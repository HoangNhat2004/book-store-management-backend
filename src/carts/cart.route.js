// src/carts/cart.route.js
const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken'); // Middleware đa năng
const { getCart, addToCart, updateCartItem, clearCart } = require('./cart.controller');

// Tất cả đều cần đăng nhập
router.get("/", verifyToken, getCart);
router.post("/add", verifyToken, addToCart);
router.put("/update", verifyToken, updateCartItem);
router.delete("/clear", verifyToken, clearCart);

module.exports = router;