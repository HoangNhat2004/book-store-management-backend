// src/books/priceHistory.model.js (Tạo file mới)
const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema({
    bookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
        required: true
    },
    oldPrice: Number, // Giá cũ trước khi đổi
    newPrice: Number, // Giá mới (giá sale)
    changedBy: {      // Người thực hiện đổi giá (Admin)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    note: String // Ví dụ: "Sale đợt 1", "Sale đợt 2"
}, {
    timestamps: true // Sẽ có createdAt để biết thời điểm đổi giá
});

const PriceHistory = mongoose.model('PriceHistory', priceHistorySchema);
module.exports = PriceHistory;