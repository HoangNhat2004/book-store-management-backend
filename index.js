const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require('jsonwebtoken');
// Giữ bí mật JWT này
const JWT_SECRET = process.env.JWT_SECRET_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30";

const mongoose = require("mongoose");
const port = process.env.PORT || 5000;
require('dotenv').config()

// middleware
app.use(express.json());
// THÊM DÒNG NÀY để xử lý data từ VNPay
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: [
        'http://localhost:5173', // Cho phép localhost
        'https://book-store-management-frontend-delta.vercel.app', // Production domain
        'https://book-store-backend-97tz.onrender.com', // Cho phép chính nó
        /^https:\/\/book-store-management-frontend-.*\.vercel\.app$/ // Regex cho các preview URLs
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Authorization']
}));

// routes
const bookRoutes = require('./src/books/book.route');
const orderRoutes = require("./src/orders/order.route")
const userRoutes =  require("./src/users/user.route")
const adminRoutes = require("./src/stats/admin.stats")
const paymentRoutes = require("./src/payment/payment.route") // <-- THÊM MỚI

app.use("/api/books", bookRoutes)
app.use("/api/orders", orderRoutes)
app.use("/api/auth", userRoutes)
app.use("/api/admin", adminRoutes)
app.use("/api/payment", paymentRoutes) // <-- THÊM MỚI

app.get('/api/admin-token', (req, res) => {
  const token = jwt.sign(
    { sub: 'admin123', name: 'Admin', admin: true },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token });
});

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://bookuser:U8xdJsXMSxePokrL@book-store-cluster.ck1zkmj.mongodb.net/?appName=book-store-cluster");
  app.use("/", (req, res) => {
    res.send("Book Store Server is running!");
  });
}

main().then(() => console.log("Mongodb connect successfully!")).catch(err => console.log(err));

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});