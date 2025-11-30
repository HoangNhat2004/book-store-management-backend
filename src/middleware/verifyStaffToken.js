// src/middleware/verifyStaffToken.js (Tạo file mới)
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET_KEY || "SECRET_KEY_CUA_BAN"; // Dùng chung key với index.js

const verifyStaffToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        
        // Cho phép nếu là admin HOẶC employee
        if (user.role === 'admin' || user.role === 'employee') {
            req.user = user;
            next();
        } else {
            return res.status(403).json({ message: 'Staff access required' });
        }
    });
};

module.exports = verifyStaffToken;