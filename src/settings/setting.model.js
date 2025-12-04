const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
    storeName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    // Có thể mở rộng thêm logo, social links... sau này
}, { timestamps: true });

const Setting = mongoose.model('Setting', settingSchema);
module.exports = Setting;