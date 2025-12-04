const express = require('express');
const { getBanner, updateBanner } = require('./banner.controller');
const verifyAdminToken = require('../middleware/verifyAdminToken');
const router = express.Router();

// Ai cũng xem được banner
router.get("/", getBanner);

// Chỉ Admin mới được sửa
router.put("/", verifyAdminToken, updateBanner);

module.exports = router;