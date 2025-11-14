const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    address: {
        address: { // <-- 1. THÊM DÒNG NÀY (ĐỊA CHỈ ĐƯỜNG PHỐ)
            type: String,
            required: true,
        },
        city: { // (Quận/Huyện)
            type: String,
            required: true,
        },
        country: String,
        state: String, // (Tỉnh/Thành phố)
        zipcode: String,
    },
    phone: {
        type: Number,
        required: true,
    },
    items: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Book', // Vẫn giữ tham chiếu nếu cần
                required: true,
            },
            title: { type: String, required: true },
            price: { type: Number, required: true }, // Giá tại thời điểm mua
            quantity: { type: Number, required: true, default: 1 }
        }
    ],
    shippingFee: { // <-- THÊM TRƯỜNG MỚI
        type: Number,
        required: true,
        default: 0
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    status: {
        type: String,
        enum: ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
        default: 'Pending'
    }
}, {
    timestamps: true,
})

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;