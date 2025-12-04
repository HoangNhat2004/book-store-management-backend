const Setting = require("./setting.model");

const getSettings = async (req, res) => {
    try {
        let settings = await Setting.findOne();
        if (!settings) {
            // Tạo dữ liệu mặc định nếu chưa có
            settings = new Setting({
                storeName: "My Book Store",
                email: "contact@bookstore.com",
                phone: "+84 123 456 789",
                address: "123 Book Street, Ho Chi Minh City"
            });
            await settings.save();
        }
        res.status(200).json(settings);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch settings" });
    }
};

const updateSettings = async (req, res) => {
    try {
        // Tìm và update document đầu tiên (vì chỉ có 1 cấu hình duy nhất)
        const updatedSettings = await Setting.findOneAndUpdate(
            {}, 
            req.body, 
            { new: true, upsert: true } // upsert: chưa có thì tạo mới
        );
        res.status(200).json({ message: "Settings updated", settings: updatedSettings });
    } catch (error) {
        res.status(500).json({ message: "Failed to update settings" });
    }
};

module.exports = { getSettings, updateSettings };