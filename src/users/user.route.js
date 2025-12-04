// src/users/user.route.js
const express = require('express');
const User = require('./user.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const admin = require('firebase-admin');

const router = express.Router();
const verifyAdminToken = require('../middleware/verifyAdminToken');

// --- KHÓA BÍ MẬT CỐ ĐỊNH (HARDCODED) ---
// Dùng đúng chuỗi cũ để khớp với các middleware hiện tại
const JWT_SECRET = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30";

// ==================================================================
// 1. CÁC ROUTE QUẢN LÝ (ADMIN/STAFF) - ĐẶT LÊN TRÊN CÙNG
// ==================================================================

// Lấy danh sách nhân viên (Chỉ Admin)
// Phải đặt trên cùng để không bị nhầm "employees" là một ":email"
router.get("/employees", verifyAdminToken, async (req, res) => {
    try {
        const users = await User.find({ role: 'employee' }).sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch employees" });
    }
});

// Tạo nhân viên (Chỉ Admin)
router.post("/create-employee", verifyAdminToken, async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !password || !email) return res.status(400).json({message: "Missing credentials"});
    
    try {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) return res.status(400).json({ message: "Username or email already exists" });

        const newUser = new User({ 
            username, 
            email, 
            password, 
            role: 'employee' 
        });
        await newUser.save();
        res.status(201).json({ message: "Employee created successfully" });
    } catch (error) {
        res.status(500).json({ message: "Error creating employee" });
    }
});

// Cập nhật thông tin nhân viên (Chỉ Admin)
router.put("/users/:id", verifyAdminToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, password } = req.body;
        
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (username) user.username = username;
        if (email) user.email = email;
        if (password) user.password = password; // Pre-save sẽ hash

        await user.save();
        res.status(200).json({ message: "User updated successfully", user });
    } catch (error) {
        res.status(500).json({ message: "Failed to update user" });
    }
});

// Xóa nhân viên (Chỉ Admin)
router.delete("/users/:id", verifyAdminToken, async (req, res) => {
    try {
        const { id } = req.params;
        const deletedUser = await User.findByIdAndDelete(id);
        if(!deletedUser) return res.status(404).json({ message: "User not found" });
        res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Failed to delete user" });
    }
});

// API Update Address Thông Minh (Chấp nhận cả JWT và Firebase)
router.put("/update-address", async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).send({ message: "No token provided" });

    let userEmail = null;
    let userId = null;

    // Cách 1: Thử JWT (Local)
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userEmail = decoded.email; 
        userId = decoded.id;
    } catch (jwtError) {}

    // Cách 2: Thử Firebase (Google)
    if (!userEmail && !userId) {
        try {
            if (admin.apps.length > 0) {
                const decodedToken = await admin.auth().verifyIdToken(token);
                userEmail = decodedToken.email;
            }
        } catch (firebaseError) {}
    }

    // Cách 3: Fallback tìm theo ID
    if (!userEmail && userId) {
        const u = await User.findById(userId);
        if (u) userEmail = u.email;
    }

    if (!userEmail) return res.status(403).send({ message: "Invalid Token" });

    try {
        const addressData = req.body;
        let user = await User.findOne({ email: userEmail });
        
        if (!user) {
            // Nếu user Google lần đầu mua -> Tạo mới
            user = new User({
                username: userEmail.split('@')[0],
                email: userEmail,
                password: "google_login_auto_gen",
                role: 'user',
                defaultAddress: addressData
            });
            await user.save();
        } else {
            user.defaultAddress = addressData;
            await user.save();
        }
        res.status(200).json({ message: "Address updated successfully", user });
    } catch (error) {
        console.error("Update Address Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ==================================================================
// 2. CÁC ROUTE ĐỘNG (PHẢI ĐẶT SAU CÁC ROUTE CỤ THỂ)
// ==================================================================

// Lấy thông tin user theo email (Dùng cho Auto-fill ở Checkout/Dashboard)
router.get("/:email", async (req, res) => {
    try {
        const { email } = req.params;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });
        res.status(200).json(user);
    } catch (error) {
        console.error("Fetch user error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// ==================================================================
// 3. AUTH ROUTES (LOGIN / REGISTER)
// ==================================================================

router.post("/register", async (req, res) => {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) return res.status(400).json({ message: "Missing info" });

    try {
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) return res.status(400).json({ message: "User exists" });

        const newUser = new User({
            username, email, password,
            role: (role === "admin" ? "admin" : "user")
        });
        await newUser.save();
        res.status(201).json({
            message: "User registered successfully",
            user: { username: newUser.username, email: newUser.email, role: newUser.role }
        });
    } catch (error) { res.status(500).json({ message: "Error" }); }
});

router.post("/login", async (req, res) => {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ message: "Missing info" });

    try {
        const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] });
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: "Invalid password" });

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role, email: user.email },
            JWT_SECRET,
            { expiresIn: "7d" }
        );
        res.status(200).json({ message: "Login successful", token, user });
    } catch (error) { res.status(500).json({ message: "Error" }); }
});

router.post("/admin-login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user || (user.role !== 'admin' && user.role !== 'employee')) 
            return res.status(401).send({ message: "Access denied" });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).send({ message: "Invalid password" });

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role, email: user.email, admin: true },
            JWT_SECRET,
            { expiresIn: "24h" }
        );
        return res.status(200).json({ message: "Admin login successful", token, user });
    } catch (e) { res.status(401).send({ message: "Failed" }); }
});

router.post("/employee-login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user || user.role !== 'employee') return res.status(403).send({ message: "Access denied" });
        if (!(await bcrypt.compare(password, user.password))) return res.status(401).send({ message: "Invalid password" });

        const token = jwt.sign(
            { id: user._id, username: user.username, role: user.role, email: user.email },
            JWT_SECRET,
            { expiresIn: "24h" }
        );
        return res.status(200).json({ message: "Employee login successful", token, user });
    } catch (e) { res.status(500).send({ message: "Failed" }); }
});

module.exports = router;