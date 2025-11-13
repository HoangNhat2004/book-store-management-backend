const admin = require('firebase-admin');

// Lấy service account từ Biến Môi trường
try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log("Firebase Admin SDK initialized.");
} catch (error) {
    console.error("Firebase Admin SDK initialization error:", error.message);
    // Nếu không có service account, app sẽ không thể xác thực user
}

/**
 * Middleware để xác thực Firebase ID Token
 */
async function verifyFirebaseToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No valid token provided' });
    }

    const idToken = authHeader.split(' ')[1];

    try {
        // Xác thực token bằng Firebase Admin
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        
        // Gắn thông tin user (ví dụ: email, uid) vào request
        req.user = decodedToken;
        
        next(); // Token hợp lệ, cho phép đi tiếp
    } catch (error) {
        console.error('Error verifying Firebase token:', error);
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
}

module.exports = verifyFirebaseToken;