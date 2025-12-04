// src/orders/order.controller.js
const Order = require("./order.model");
const Book = require("../books/book.model");
const axios = require('axios'); // <-- Đã thêm axios
const mongoose = require('mongoose');
const { getGHNFee } = require('../shipping/shipping.controller'); // <-- Import GHN

const createAOrder = async (req, res) => {
    try {
        const { name, email, address, phone, items: frontendItems } = req.body;

        // 1. Validate Giỏ hàng
        if (!frontendItems || frontendItems.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }
        
        // 2. Validate Địa chỉ (Bắt buộc phải có ID để tính ship)
        if (!address || !address.to_district_id || !address.to_ward_code) {
            return res.status(400).json({ message: "Address (District ID, Ward Code) is required." });
        }

        // 3. Lấy thông tin sách & Tính toán
        const productIds = frontendItems.map((item) => item.productId);
        const books = await Book.find({ _id: { $in: productIds } });
        const bookMap = new Map(books.map(book => [book._id.toString(), book]));

        let verifiedTotalPrice = 0;
        const verifiedItems = [];
        let totalWeight = 0; // Tổng cân nặng (gram)

        for (const item of frontendItems) {
            const book = bookMap.get(item.productId);
            if (!book) {
                return res.status(404).json({ message: `Book not found: ${item.productId}` });
            }
            
            // Kiểm tra tồn kho
            if (book.stock < (item.quantity || 1)) {
                return res.status(400).json({ message: `Sách "${book.title}" không đủ hàng. (Còn: ${book.stock})` });
            }
            
            // Trừ tồn kho
            book.stock -= (item.quantity || 1);
            await book.save();

            const quantity = item.quantity || 1;
            verifiedItems.push({
                productId: book._id,
                title: book.title,
                price: book.newPrice,
                quantity: quantity
            });

            verifiedTotalPrice += book.newPrice * quantity;
            totalWeight += (200 * quantity); // Giả định mỗi sách nặng 200g
        }

        // 4. TÍNH PHÍ SHIP TỪ GHN
        let feeInVND = 0;
        try {
            feeInVND = await getGHNFee(
                address.to_district_id,
                address.to_ward_code,
                totalWeight
            );
        } catch (ghnError) {
            console.error("GHN Error:", ghnError.message);
            feeInVND = 30000; // Phí mặc định nếu lỗi mạng
        }

        // 5. Quy đổi phí ship & Tổng tiền
        const EXCHANGE_RATE_USD_TO_VND = 25000;
        const shippingFeeUSD = feeInVND / EXCHANGE_RATE_USD_TO_VND;
        const grandTotalPrice = verifiedTotalPrice + shippingFeeUSD;

        // 6. Tạo đơn hàng
        const newOrder = new Order({
            name,
            email,
            address, // Lưu nguyên object address
            phone,
            items: verifiedItems,
            shippingFee: shippingFeeUSD,
            totalPrice: grandTotalPrice,
            status: 'Pending'
        });

        const savedOrder = await newOrder.save();
        res.status(201).json(savedOrder);

    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ message: "Failed to create order on server" });
    }
};

const getOrderByEmail = async (req, res) => {
    try {
        const { email } = req.params;
        const orders = await Order.find({ email }).sort({ createdAt: -1 });
        if (!orders) return res.status(404).json({ message: "Order not found" });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch order" });
    }
};

const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch all orders" });
    }
}

const confirmOrderPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedOrder = await Order.findByIdAndUpdate(
            id, 
            { status: 'Processing' }, 
            { new: true }
        );
        if(!updatedOrder) return res.status(404).json({message: "Order not found"});
        res.status(200).json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: "Failed to confirm payment" });
    }
}

module.exports = {
    createAOrder,
    getOrderByEmail,
    getAllOrders,
    confirmOrderPayment
};