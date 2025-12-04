const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

// Key này phải khớp với key trong user.route.js
const JWT_SECRET = process.env.JWT_SECRET_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30';

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    // --- CÁCH 1: Thử mở bằng chìa khóa JWT (Tài khoản thường) ---
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Nếu thành công -> Đây là user thường
        req.user = decoded; 
        return next(); // Cho qua ngay
    } catch (jwtError) {
        // Nếu lỗi JWT, đừng chặn vội, thử tiếp Cách 2...
    }

    // --- CÁCH 2: Thử mở bằng chìa khóa Firebase (Tài khoản Google) ---
    try {
        // Kiểm tra xem Firebase đã khởi động chưa
        if (admin.apps.length === 0) {
             // Nếu chưa init firebase admin thì return lỗi luôn để tránh crash
             return res.status(403).json({ message: "Invalid Token & Firebase not initialized" });
        }

        const decodedToken = await admin.auth().verifyIdToken(token);
        // Nếu thành công -> Đây là user Google
        req.user = decodedToken;
        return next(); // Cho qua ngay
    } catch (firebaseError) {
        // Cả 2 cách đều thất bại -> Token không hợp lệ
        return res.status(403).json({ message: "Invalid or Expired Token!" });
    }
};

module.exports = verifyToken;