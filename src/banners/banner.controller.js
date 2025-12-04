const Banner = require("./banner.model");

// Lấy Banner (Nếu chưa có thì tạo mặc định)
const getBanner = async (req, res) => {
    try {
        let banner = await Banner.findOne();
        if (!banner) {
            // Tạo banner mặc định nếu DB trống
            banner = new Banner({
                title: "New Releases This Week",
                description: "It's time to update your reading list with some of the latest and greatest releases in the literary world.",
                image: "banner.png" 
            });
            await banner.save();
        }
        res.status(200).json(banner);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch banner" });
    }
};

// Cập nhật Banner (Chỉ Admin)
const updateBanner = async (req, res) => {
    try {
        // Tìm và update document đầu tiên tìm thấy (vì chỉ có 1 banner chính)
        const updatedBanner = await Banner.findOneAndUpdate(
            {}, 
            req.body, 
            { new: true, upsert: true } // upsert: chưa có thì tạo mới
        );
        res.status(200).json({ message: "Banner updated", banner: updatedBanner });
    } catch (error) {
        res.status(500).json({ message: "Failed to update banner" });
    }
};

module.exports = { getBanner, updateBanner };