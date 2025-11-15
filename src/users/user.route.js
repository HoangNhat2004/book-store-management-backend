// src/users/user.route.js
const express = require('express');
const User = require('./user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Đảm bảo có bcrypt

const router = express.Router();

// JWT_SECRET fallback (an toàn cho dev, production nên dùng Render env)
const JWT_SECRET = process.env.JWT_SECRET_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30';

// POST /api/auth/register
router.post("/register", async (req, res) => {
    // --- SỬA LẠI: Chỉ nhận username, password ---
    const { username, password, role } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
    }

    try {
        // --- SỬA LẠI LOGIC KIỂM TRA ---
        // Chỉ kiểm tra trùng lặp USERNAME
        const existingUser = await User.findOne({ username: username });
        
        if (existingUser) {
            // Chỉ báo lỗi username
            return res.status(400).json({ message: "Username already exists" });
        }
        // --- KẾT THÚC SỬA ---

        const newUser = new User({
            username,
            email: null, // Luôn gán email là null khi đăng ký
            password, // model sẽ tự hash
            role: (role === "admin" ? "admin" : "user")
        });

        await newUser.save();

        res.status(201).json({
            message: "User registered successfully",
            user: { username: newUser.username, email: newUser.email, role: newUser.role }
        });
    } catch (error) {
        console.error("Register error:", error);
        // Bắt lỗi validation (ví dụ: nếu username "unique" bị vi phạm)
        if (error.name === 'ValidationError' || error.code === 11000) {
             return res.status(400).json({ message: "Username already exists." });
        }
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
        return res.status(400).json({ message: "Please provide username/email and password" });
    }

    try {
        const user = await User.findOne({
            $or: [{ username: identifier }, { email: identifier }]
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid password" });
        }

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                username: user.username,
                email: user.email,
                role: user.role  // QUAN TRỌNG: TRẢ VỀ role
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// --- THÊM ROUTE MỚI CHO ADMIN LOGIN ---
router.post("/admin-login", async (req, res) => {
    const { username, password } = req.body;

    // 1. Kiểm tra thông tin đăng nhập trên SERVER
    // (Trong dự án thật, "admin" và "admin123" nên được lưu trong .env)
    if (username !== "admin" || password !== "admin123") {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // 2. Nếu đúng, tạo token admin
    try {
        const token = jwt.sign(
            { id: 'admin_user', username: 'admin', role: 'admin', admin: true }, // 'admin: true' là quan trọng
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(200).json({
            message: "Admin login successful",
            token,
            user: {
                username: 'admin',
                role: 'admin'
            }
        });
    } catch (error) {
        console.error("Admin Login error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;