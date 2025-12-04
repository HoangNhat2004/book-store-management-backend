// src/carts/cart.model.js
const mongoose = require('mongoose');

const cartSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true,
        unique: true // Một user chỉ có 1 giỏ hàng
    },
    items: [
        {
            productId: { 
                type: mongoose.Schema.Types.ObjectId, 
                ref: 'Book', 
                required: true 
            },
            quantity: { 
                type: Number, 
                required: true, 
                min: 1,
                default: 1 
            }
        }
    ]
}, { timestamps: true });

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;