const express = require('express');
const User = require('./user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Đảm bảo có bcrypt
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET_KEY || 'fallback-secret-key-2025';

// POST /api/auth/register - Đăng ký user hoặc admin
router.post("/register", async (req, res) => {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: "Please provide username, email, and password" });
    }

    try {
        // Kiểm tra username hoặc email đã tồn tại
        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });
        if (existingUser) {
            return res.status(400).json({ message: "Username or email already exists" });
        }

        // Tạo user mới
        const newUser = new User({
            username,
            email,
            password, // sẽ được hash tự động bởi pre-save hook
            role: role || "user"
        });

        await newUser.save();

        res.status(201).json({
            message: "User registered successfully",
            user: {
                username: newUser.username,
                email: newUser.email,
                role: newUser.role
            }
        });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/auth/login - Đăng nhập bằng email hoặc username
router.post("/login", async (req, res) => {
    const { identifier, password } = req.body;  // identifier = email hoặc username

    if (!identifier || !password) {
        return res.status(400).json({ message: "Please provide email/username and password" });
    }

    try {
        // Tìm user bằng username HOẶC email
        const user = await User.findOne({
            $or: [
                { username: identifier },
                { email: identifier }
            ]
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // So sánh password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid password" });
        }

        // Tạo JWT
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
                role: user.role
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// [TÙY CHỌN] Giữ lại route cũ /admin nếu frontend dùng
router.post("/admin", async (req, res) => {
    const { username, password } = req.body;
    try {
        const admin = await User.findOne({ username, role: "admin" });
        if (!admin) return res.status(404).json({ message: "Admin not found" });

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid password" });

        const token = jwt.sign(
            { id: admin._id, username: admin.username, role: admin.role },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ message: "Admin login successful", token, user: { username: admin.username, role: admin.role } });
    } catch (error) {
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;