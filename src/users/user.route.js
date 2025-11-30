// src/users/user.route.js
const express = require('express');
const User = require('./user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Đảm bảo có bcrypt

const router = express.Router();

const verifyAdminToken = require('../middleware/verifyAdminToken');
const verifyFirebaseToken = require('../middleware/verifyFirebaseToken');

// JWT_SECRET fallback (an toàn cho dev, production nên dùng Render env)
const JWT_SECRET = process.env.JWT_SECRET_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30';

// API CHO ADMIN TẠO EMPLOYEE
router.post("/create-employee", verifyAdminToken, async (req, res) => {
    const { username, email, password } = req.body;
    try {
        // Logic giống register nhưng set role = 'employee'
        const newUser = new User({ username, email, password, role: 'employee' });
        await newUser.save();
        res.status(201).json({ message: "Employee created" });
    } catch (error) {
        res.status(500).json({ message: "Error creating employee" });
    }
});

// API CHO USER CẬP NHẬT ĐỊA CHỈ (Gọi khi checkout thành công hoặc trong profile)
router.put("/update-address", verifyFirebaseToken, async (req, res) => {
    try {
        const { email } = req.user; // Lấy từ token
        const addressData = req.body; // Object địa chỉ
        await User.findOneAndUpdate({ email }, { defaultAddress: addressData });
        res.status(200).json({ message: "Address updated" });
    } catch (e) {
        res.status(500).json({ message: "Error" });
    }
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
    const { username, email, password, role } = req.body;

    // --- SỬA LẠI: Yêu cầu cả 3 trường ---
    if (!username || !email || !password) {
        return res.status(400).json({ message: "Username, email, and password are required" });
    }

    try {
        // --- SỬA LẠI: Logic kiểm tra (email sẽ không bao giờ là undefined) ---
        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });
        if (existingUser) {
            return res.status(400).json({ message: "Username or email already exists" });
        }

        const newUser = new User({
            username,
            email: email, // <-- Đã có email
            password,
            role: (role === "admin" ? "admin" : "user")
        });

        await newUser.save();

        res.status(201).json({
            message: "User registered successfully",
            user: { username: newUser.username, email: newUser.email, role: newUser.role }
        });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/auth/login
// ... (Logic /login của bạn đã đúng, giữ nguyên) ...
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
            { id: user._id, username: user.username, role: user.role, email: user.email }, // Thêm email vào token
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


// --- THÊM ROUTE MỚI CHO ADMIN LOGIN ---
// ... (Logic /admin-login của bạn đã đúng, giữ nguyên) ...
router.post("/admin-login", async (req, res) => {
    const { username, password } = req.body;
    if (username !== "admin" || password !== "admin123") {
      return res.status(401).json({ message: "Invalid username or password" });
    }
    try {
        const token = jwt.sign(
            { id: 'admin_user', username: 'admin', role: 'admin', admin: true }, 
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