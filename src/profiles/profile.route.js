// src/profiles/profile.route.js
const express = require('express');
const Profile = require('./profile.model');
const router = express.Router();

// API này sẽ được frontend gọi mỗi khi user đăng nhập
// Nó sẽ tạo mới hoặc cập nhật thông tin profile
router.post("/upsert", async (req, res) => {
    const { email, username, photoURL } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    try {
        const profile = await Profile.findOneAndUpdate(
            { email: email }, // Tìm bằng email
            { $set: { username, photoURL } }, // Cập nhật (hoặc set)
            { upsert: true, new: true, setDefaultsOnInsert: true } // Lệnh "Upsert"
        );
        res.status(200).json(profile);
    } catch (error) {
        console.error("Profile upsert error:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;