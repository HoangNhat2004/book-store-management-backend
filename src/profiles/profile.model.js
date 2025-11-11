// src/profiles/profile.model.js
const mongoose =  require('mongoose');

// Schema này sẽ lưu thông tin public từ Firebase
const profileSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, index: true },
    username: { type: String },
    photoURL: { type: String }
}, { timestamps: true });

const Profile = mongoose.model('Profile', profileSchema);

module.exports = Profile;