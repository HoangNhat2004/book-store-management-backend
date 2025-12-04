// src/upload/upload.route.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const admin = require('firebase-admin');

// 1. Sử dụng MemoryStorage (Lưu vào RAM thay vì ổ cứng để tránh lỗi trên Render)
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // Giới hạn 5MB
});

router.post("/", upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send({ message: "No file uploaded" });
        }

        // 2. Kiểm tra Firebase Admin đã khởi động chưa
        if (admin.apps.length === 0) {
            return res.status(500).json({ message: "Firebase Admin not initialized" });
        }

        // 3. Lấy Bucket (Kho chứa)
        // LƯU Ý: Thay dòng dưới bằng đúng 'storageBucket' trong file firebase.config.js của bạn
        // Theo file bạn gửi trước đó, nó là: "book-store-management-8755e.firebasestorage.app"
        const bucketName = "book-store-management-8755e.firebasestorage.app"; 
        const bucket = admin.storage().bucket(bucketName);

        const fileName = `banners/${Date.now()}-${req.file.originalname}`;
        const file = bucket.file(fileName);

        // 4. Stream file lên Firebase
        const stream = file.createWriteStream({
            metadata: {
                contentType: req.file.mimetype,
            },
        });

        stream.on('error', (e) => {
            console.error("Firebase Stream Error:", e);
            res.status(500).json({ message: "Firebase upload error", error: e.message });
        });

        stream.on('finish', async () => {
            // 5. Cấp quyền Public để ai cũng xem được ảnh
            await file.makePublic();
            
            // 6. Tạo đường dẫn Public
            // (Dạng: https://storage.googleapis.com/BUCKET_NAME/FILE_NAME)
            const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
            
            res.status(200).json({ 
                message: "Image uploaded successfully", 
                image: publicUrl 
            });
        });

        stream.end(req.file.buffer);

    } catch (error) {
        console.error("Upload API Error:", error);
        res.status(500).json({ message: "Upload failed", error: error.message });
    }
});

module.exports = router;