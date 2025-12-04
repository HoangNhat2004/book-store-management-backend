// src/books/priceHistory.model.js
const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema({
    bookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
        required: true
    },
    oldPrice: {
        type: Number,
        required: true
    },
    newPrice: {
        type: Number,
        required: true
    },
    // --- BỔ SUNG TRƯỜNG NÀY ĐỂ SỬA LỖI ---
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Liên kết với bảng User để lấy tên Admin
    },
    // -------------------------------------
    note: String,
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true 
});

const PriceHistory = mongoose.model('PriceHistory', priceHistorySchema);
module.exports = PriceHistory;