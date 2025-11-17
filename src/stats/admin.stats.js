const mongoose = require('mongoose');
const express = require('express');
const Order = require('../orders/order.model');
const Book = require('../books/book.model');
const router = express.Router();

const verifyAdminToken = require('../middleware/verifyAdminToken');

// --- BỘ LỌC ĐƠN HÀNG HỢP LỆ ---
const validOrderFilter = { 
    items: { $exists: true, $ne: [] },
    status: { $ne: 'Cancelled' } // <-- THÊM ĐIỀU KIỆN LỌC
};
// --- KẾT THÚC BỘ LỌC ---


// Function to calculate admin stats
router.get("/", verifyAdminToken, async (req, res) => {
    try {
        // 1. Total number of orders
        const totalOrders = await Order.countDocuments(validOrderFilter);

        // 2. Total sales
        const totalSales = await Order.aggregate([
            { $match: validOrderFilter }, 
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: "$totalPrice" },
                }
            }
        ]);

        // 4. Trending books
        const trendingBooksCount = await Book.aggregate([
            { $match: { trending: true } },
            { $count: "trendingBooksCount" }
        ]);
        
        const trendingBooks = trendingBooksCount.length > 0 ? trendingBooksCount[0].trendingBooksCount : 0;

        // 5. Total number of books
        const totalBooks = await Book.countDocuments();

        // 6. Monthly sales
        const monthlySales = await Order.aggregate([
            { $match: validOrderFilter }, 
            // ... (phần còn lại của monthlySales giữ nguyên)
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    totalSales: { $sum: "$totalPrice" },
                    totalOrders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }  
        ]);

        // --- 7. THÊM MỚI: TOP USERS BY AVERAGE ORDER ---
        const topUsers = await Order.aggregate([
            // BƯỚC 1: Lọc *chỉ* các đơn hàng đã "Delivered"
            { 
                $match: { 
                    status: 'Delivered',
                    items: { $exists: true, $ne: [] } 
                } 
            },
            // BƯỚC 2: Nhóm theo email khách hàng
            {
                $group: {
                    _id: "$email", 
                    name: { $first: "$name" }, 
                    averageOrderValue: { $avg: "$totalPrice" } // Tính giá trị trung bình
                }
            },
            // BƯỚC 3: Lấy thông tin profile (ảnh)
            {
                $lookup: {
                    from: 'profiles', 
                    localField: '_id', 
                    foreignField: 'email', 
                    as: 'userProfile' 
                }
            },
            { $sort: { averageOrderValue: -1 } }, 
            { $limit: 8 }, 
            // BƯỚC 4: Làm sạch dữ liệu
            {
                $project: {
                    _id: 1, 
                    name: 1, 
                    averageOrderValue: 1, 
                    photoURL: { $arrayElemAt: ["$userProfile.photoURL", 0] }
                }
            }
        ]);
        // --- KẾT THÚC THÊM MỚI ---

        // Result summary
        res.status(200).json({  
            totalOrders,
            totalSales: totalSales[0]?.totalSales || 0,
            trendingBooks,
            totalBooks,
            monthlySales,
            topUsers: topUsers // <-- Gửi dữ liệu mới về frontend
        });
      
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        res.status(500).json({ message: "Failed to fetch admin stats" });
    }
})

module.exports = router;