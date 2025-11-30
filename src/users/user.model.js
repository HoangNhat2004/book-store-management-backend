// src/users/user.model.js
const mongoose = require('mongoose')
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: false,
        unique: true,
        sparse: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'employee'], // <-- THÊM 'employee'
        required: true,
        default: 'user'
    },
    // --- THÊM ĐỊA CHỈ MẶC ĐỊNH ---
    defaultAddress: {
        address: String,
        city: String,     // Lưu tên Tỉnh/TP
        district: String, // Lưu tên Quận/Huyện
        ward: String,     // Lưu tên Phường/Xã
        
        // Lưu ID để tính phí ship GHN
        province_id: Number,
        district_id: Number,
        ward_code: String,
        
        phone: String
    }
}, { timestamps: true })

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
})

const User = mongoose.model('User', userSchema);
module.exports = User;