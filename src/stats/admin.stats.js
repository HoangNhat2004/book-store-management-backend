const mongoose = require('mongoose');
const express = require('express');
const Order = require('../orders/order.model');
const Book = require('../books/book.model');
const router = express.Router();


// --- BỘ LỌC ĐƠN HÀNG HỢP LỆ ---
const validOrderFilter = { items: { $exists: true, $ne: [] } };
// --- KẾT THÚC BỘ LỌC ---


// Function to calculate admin stats
router.get("/", async (req, res) => {
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
            { $match: validOrderFilter },
            {
                $group: {
                    _id: "$email", // Nhóm theo email khách hàng
                    name: { $first: "$name" }, // Lấy tên từ đơn hàng đầu tiên
                    averageOrderValue: { $avg: "$totalPrice" } // Tính giá trị trung bình
                }
            },
            // --- THÊM BƯỚC $lookup NÀY ---
            {
                $lookup: {
                    from: 'profiles', // Tên collection 'profiles' trong MongoDB
                    localField: '_id', // Trường email từ bước $group ở trên
                    foreignField: 'email', // Trường email trong collection 'profiles'
                    as: 'userProfile' // Tên mảng kết quả
                }
            },
            { $sort: { averageOrderValue: -1 } }, // Sắp xếp giảm dần
            { $limit: 8 }, // Lấy 8 người dùng hàng đầu
            // --- THÊM BƯỚC $project ĐỂ LÀM SẠCH DỮ LIỆU ---
            {
                $project: {
                    _id: 1, // Giữ lại email
                    name: 1, // Giữ lại tên
                    averageOrderValue: 1, // Giữ lại giá trị TB
                    // Lấy photoURL từ mảng userProfile (nếu có)
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