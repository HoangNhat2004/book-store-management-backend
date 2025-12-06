// src/middleware/verifyToken.js
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');

const JWT_SECRET = process.env.JWT_SECRET_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30';

// --- THÊM ĐOẠN KHỞI TẠO NÀY VÀO ĐẦU FILE ---
try {
    // Kiểm tra nếu Firebase chưa được khởi tạo thì mới khởi tạo
    if (admin.apps.length === 0) {
        // Lấy thông tin từ biến môi trường (như file cũ đã làm)
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            console.log("✅ Firebase Admin SDK initialized in verifyToken.");
        } else {
            console.warn("⚠️ Warning: FIREBASE_SERVICE_ACCOUNT not found in env.");
        }
    }
} catch (error) {
    console.error("❌ Firebase Init Error:", error.message);
}
// ---------------------------------------------

const verifyToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "No token provided" });
    }

    // --- CÁCH 1: Thử mở bằng chìa khóa JWT (Tài khoản thường / Postman) ---
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; 
        return next(); // Thành công -> Cho qua
    } catch (jwtError) {
        // Nếu không phải JWT thường, thử tiếp cách 2...
    }

    // --- CÁCH 2: Thử mở bằng chìa khóa Firebase (Tài khoản Google) ---
    try {
        if (admin.apps.length === 0) {
             return res.status(403).json({ message: "Firebase not initialized" });
        }

        const decodedToken = await admin.auth().verifyIdToken(token);
        req.user = decodedToken;
        return next(); // Thành công -> Cho qua
    } catch (firebaseError) {
        // Cả 2 cách đều thất bại
        return res.status(403).json({ message: "Invalid or Expired Token!" });
    }
};

module.exports = verifyToken;