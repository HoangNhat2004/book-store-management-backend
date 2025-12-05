// src/stats/admin.stats.js
const mongoose = require('mongoose');
const express = require('express');
const Order = require('../orders/order.model');
const Book = require('../books/book.model');
const User = require('../users/user.model'); 
const router = express.Router();
const verifyAdminToken = require('../middleware/verifyAdminToken');

router.get("/", verifyAdminToken, async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        
        const totalSalesResult = await Order.aggregate([
            { $group: { _id: null, totalSales: { $sum: "$totalPrice" } } }
        ]);
        const totalSales = totalSalesResult.length > 0 ? totalSalesResult[0].totalSales : 0;

        const trendingBooksCount = await Book.countDocuments({ trending: true });
        const totalBooks = await Book.countDocuments();
        
        // Doanh thu theo tháng
        const monthlySales = await Order.aggregate([
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    totalSales: { $sum: "$totalPrice" },
                    totalOrders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }  
        ]);

        // --- TÍNH TOÁN TOP USERS (AVG ORDER VALUE) ---
        const topUsers = await Order.aggregate([
            // 1. Chỉ tính đơn đã giao thành công (Delivered) để chính xác doanh thu
            { $match: { status: 'Delivered' } }, 
            // 2. Gom nhóm theo Email
            {
                $group: {
                    _id: "$email", 
                    name: { $first: "$name" }, 
                    totalOrders: { $sum: 1 },
                    totalSpent: { $sum: "$totalPrice" },
                    averageOrderValue: { $avg: "$totalPrice" } 
                }
            },
            // 3. Lấy thêm avatar từ bảng Profile (nếu có)
            {
                $lookup: {
                    from: 'profiles', 
                    localField: '_id', 
                    foreignField: 'email', 
                    as: 'userProfile' 
                }
            },
            // 4. Sắp xếp giảm dần theo giá trị trung bình
            { $sort: { averageOrderValue: -1 } }, 
            { $limit: 5 }, // Lấy Top 5
            // 5. Format dữ liệu đầu ra
            {
                $project: {
                    _id: 0, 
                    email: "$_id",
                    name: 1, 
                    totalOrders: 1,
                    averageOrderValue: 1, 
                    photoURL: { $arrayElemAt: ["$userProfile.photoURL", 0] }
                }
            }
        ]);

        res.status(200).json({  
            totalOrders,
            totalSales,
            trendingBooks: trendingBooksCount,
            totalBooks,
            monthlySales,
            topUsers // Trả về mảng top users
        });
      
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        res.status(500).json({ message: "Failed to fetch admin stats" });
    }
})

module.exports = router;