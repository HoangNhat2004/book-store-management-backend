const express = require('express');
const { getSettings, updateSettings } = require('./setting.controller');
const verifyAdminToken = require('../middleware/verifyAdminToken');
const router = express.Router();

// Public: Để hiển thị ở Footer hoặc trang Liên hệ (nếu cần)
router.get("/", getSettings);

// Private: Chỉ Admin được sửa
router.put("/", verifyAdminToken, updateSettings);

module.exports = router;