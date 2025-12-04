// src/orders/order.model.js
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    address: {
        address: { type: String, required: true },
        city: { type: String, required: true },
        country: String,
        state: String,
        zipcode: String,
        
        // --- BỔ SUNG CÁC TRƯỜNG ID QUAN TRỌNG CHO GHN ---
        province_id: { type: Number },
        district_id: { type: Number },
        ward_code: { type: String },
        // ------------------------------------------------
    },
    phone: { 
        type: String, // Nên để String để giữ số 0 ở đầu
        required: true,
    },
    items: [
        {
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Book',
                required: true,
            },
            title: { type: String, required: true },
            price: { type: Number, required: true },
            quantity: { type: Number, required: true, default: 1 }
        }
    ],
    shippingFee: { 
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
    },
    ghnOrderCode: { // Mã vận đơn GHN
        type: String,
        default: null
    }
}, {
    timestamps: true,
})

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;