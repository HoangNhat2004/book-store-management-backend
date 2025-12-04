const express = require('express');
const router = express.Router();
const { postCategory, getAllCategories, deleteCategory } = require('./category.controller');
const verifyAdminToken = require('../middleware/verifyAdminToken');

// Public: Lấy danh mục (để hiển thị ở menu/filter)
router.get("/", getAllCategories);

// Private: Chỉ Admin được thêm/xóa
router.post("/", verifyAdminToken, postCategory);
router.delete("/:id", verifyAdminToken, deleteCategory);

module.exports = router;