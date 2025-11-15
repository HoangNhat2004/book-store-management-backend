const mongoose = require('mongoose')
const bcrypt = require('bcrypt');

const userSchema =  new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    // --- THÊM KHỐI NÀY ---
    email: {
        type: String,
        required: false, // <-- SỬA TỪ true THÀNH false
        unique: true,
        sparse: true 
    },
    // --- KẾT THÚC THÊM ---
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        required: true,
        default: 'user' // Thêm default
    }
})

userSchema.pre('save', async function( next) {
    if(!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
}
)

const User =  mongoose.model('User', userSchema);

module.exports = User;