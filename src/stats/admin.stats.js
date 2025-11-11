const mongoose = require('mongoose');
const express = require('express');
const Order = require('../orders/order.model');
const Book = require('../books/book.model');
const router = express.Router();


// --- BỘ LỌC ĐƠN HÀNG HỢP LỆ ---
// Chỉ tính các đơn hàng có trường 'items' tồn tại và không phải là mảng rỗng
const validOrderFilter = { items: { $exists: true, $ne: [] } };
// --- KẾT THÚC BỘ LỌC ---


// Function to calculate admin stats
router.get("/", async (req, res) => {
    try {
        // 1. Total number of orders
        // SỬA: Thêm bộ lọc vào countDocuments
        const totalOrders = await Order.countDocuments(validOrderFilter);

        // 2. Total sales (sum of all totalPrice from orders)
        // SỬA: Thêm $match vào đầu pipeline
        const totalSales = await Order.aggregate([
            { $match: validOrderFilter }, 
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: "$totalPrice" },
                }
            }
        ]);

        // 4. Trending books statistics: 
        const trendingBooksCount = await Book.aggregate([
            { $match: { trending: true } },
            { $count: "trendingBooksCount" }
        ]);
        
        const trendingBooks = trendingBooksCount.length > 0 ? trendingBooksCount[0].trendingBooksCount : 0;

        // 5. Total number of books
        const totalBooks = await Book.countDocuments();

        // 6. Monthly sales
        // SỬA: Thêm $match vào đầu pipeline
        const monthlySales = await Order.aggregate([
            { $match: validOrderFilter }, 
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    totalSales: { $sum: "$totalPrice" },
                    totalOrders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }  
        ]);

        // Result summary
        res.status(200).json({  
            totalOrders, // Đã được lọc
            totalSales: totalSales[0]?.totalSales || 0, // Đã được lọc
            trendingBooks,
            totalBooks,
            monthlySales, // Đã được lọc
        });
      
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        res.status(500).json({ message: "Failed to fetch admin stats" });
    }
})

module.exports = router;