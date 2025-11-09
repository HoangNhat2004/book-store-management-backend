const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require('jsonwebtoken');
const JWT_SECRET = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiYWRtaW4iOnRydWUsImlhdCI6MTUxNjIzOTAyMn0.KMUFsIDTnFmyG3nMiGM6H9FNFUROf3wh7SmqJp-QV30";

const mongoose = require("mongoose");
const port = process.env.PORT || 5000;
require('dotenv').config()

// middleware
app.use(express.json());
app.use(cors({
    origin: function (origin, callback) {
        // Cho phép tất cả Vercel domain
        const allowedOrigins = [
            'http://localhost:5173',
            'https://*.vercel.app',
            'https://book-store-management-frontend.vercel.app',
            'https://book-store-backend-97tz.onrender.com'
        ];
        
        if (!origin || allowedOrigins.some(allowed => origin.endsWith(allowed.split('*')[1])) || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
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

app.use("/api/books", bookRoutes)
app.use("/api/orders", orderRoutes)
app.use("/api/auth", userRoutes)
app.use("/api/admin", adminRoutes)
app.get('/api/admin-token', (req, res) => {
  const token = jwt.sign(
    { sub: 'admin123', name: 'Admin', admin: true },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token });
});

async function main() {
  await mongoose.connect("mongodb+srv://bookuser:U8xdJsXMSxePokrL@book-store-cluster.ck1zkmj.mongodb.net/?appName=book-store-cluster");
  app.use("/", (req, res) => {
    res.send("Book Store Server is running!");
  });
}

main().then(() => console.log("Mongodb connect successfully!")).catch(err => console.log(err));

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
