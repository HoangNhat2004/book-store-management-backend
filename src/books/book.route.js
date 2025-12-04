// src/books/book.route.js
const express = require('express');
const { 
    postABook, 
    getAllBooks, 
    getSingleBook, 
    UpdateBook, 
    deleteABook,
    getPriceHistory // <-- Phải có hàm này
} = require('./book.controller');

const verifyAdminToken = require('../middleware/verifyAdminToken');
const router = express.Router();

// 1. Create Book
router.post("/create-book", verifyAdminToken, postABook);

// 2. Get All Books
router.get("/", getAllBooks);

// 3. Get Single Book
router.get("/:id", getSingleBook);

// 4. Update Book
router.put("/edit/:id", verifyAdminToken, UpdateBook);

// 5. Delete Book
router.delete("/:id", verifyAdminToken, deleteABook);

// --- 6. QUAN TRỌNG: API LẤY LỊCH SỬ GIÁ ---
// (Kiểm tra kỹ xem file cũ của bạn có dòng này chưa)
router.get("/:id/price-history", verifyAdminToken, getPriceHistory);
// ------------------------------------------

module.exports = router;