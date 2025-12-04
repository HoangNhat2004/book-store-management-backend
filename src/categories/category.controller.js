// src/categories/category.controller.js
const Category = require('./category.model');
const Book = require('../books/book.model'); // <-- IMPORT BOOK ĐỂ KIỂM TRA

const postCategory = async (req, res) => {
    try {
        const newCategory = new Category(req.body);
        await newCategory.save();
        res.status(200).json({ message: "Category created", category: newCategory });
    } catch (error) {
        res.status(500).json({ message: "Failed to create category" });
    }
}

const getAllCategories = async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.status(200).json(categories);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch categories" });
    }
}

// --- SỬA LẠI HÀM DELETE ĐỂ AN TOÀN HƠN ---
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Kiểm tra xem có sách nào đang dùng Category này không
        const bookUsingCategory = await Book.findOne({ category: id });

        if (bookUsingCategory) {
            // Nếu tìm thấy ít nhất 1 cuốn sách -> Báo lỗi, KHÔNG CHO XÓA
            return res.status(400).json({ 
                message: "Cannot delete! This category is used by some books." 
            });
        }

        // 2. Nếu không có sách nào dùng -> Tiến hành xóa
        const category = await Category.findByIdAndDelete(id);
        
        if (!category) {
            return res.status(404).json({ message: "Category not found" });
        }

        res.status(200).json({ message: "Category deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to delete category" });
    }
}
// -------------------------------------------

module.exports = { postCategory, getAllCategories, deleteCategory }