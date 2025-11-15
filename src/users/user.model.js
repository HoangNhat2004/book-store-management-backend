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
        required: true,
        unique: true,
        sparse: true // Cho phép nhiều giá trị null, nhưng chỉ một email duy nhất
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