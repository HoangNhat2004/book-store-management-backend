const axios = require('axios');

// --- THÔNG TIN CẤU HÌNH GHTK (HARDCODED) ---
const GHTK_TOKEN = "336lDaYNGTpQVfLavEmacVpq3ScskF05xxb07kO";
const GHTK_URL = "https://services-staging.ghtklab.com/services/shipment/fee";
// --- KẾT THÚC CẤU HÌNH ---

/**
 * Hàm nội bộ để gọi GHTK và lấy phí
 * @param {object} address - Địa chỉ từ req.body
 * @param {number} weight - Cân nặng (gram)
 * @returns {number} Phí vận chuyển (VND)
 */
async function getGHTKFee(address, weight = 500) { // Giả định 1 cuốn sách nặng 500g
    if (!GHTK_TOKEN) {
        console.warn("GHTK_TOKEN is not set. Returning 0 fee.");
        return 0; // Không có token, trả về 0
    }

    // --- THAY ĐỔI ĐỊA CHỈ KHO HÀNG TẠI ĐÂY ---
    const payload = {
        "pick_province": "Thành phố Hồ Chí Minh", // <-- ĐÃ SỬA
        "pick_district": "Quận 1", // <-- ĐÃ SỬA (Giả định, bạn có thể đổi)
        "province": address.state || address.country, // Tỉnh/TP người nhận
        "district": address.city, // Quận/Huyện người nhận
        "address": address.address || address.city,
        "weight": weight,
        "transport": "road" // Giao đường bộ
    };
    // --- KẾT THÚC THAY ĐỔI ---

    try {
        const response = await axios.post(GHTK_URL, payload, {
            headers: { 'Token': GHTK_TOKEN }
        });

        if (response.data && response.data.fee && response.data.fee.fee) {
            return response.data.fee.fee; // Trả về phí (VND)
        }
        return 0; 
    } catch (error) {
        console.error("GHTK API Error:", error.response?.data || error.message);
        return 0; 
    }
}

// API Endpoint (được gọi bởi frontend)
exports.calculateFee = async (req, res) => {
    const { address } = req.body;
    if (!address || !address.city || !address.state) {
        return res.status(400).json({ message: "Address details (city, state) are required" });
    }
    
    const fee = await getGHTKFee(address, 500); // Giả định 500g
    res.status(200).json({ shippingFee: fee }); // Trả về phí (VND)
};

// Xuất hàm helper để Order Controller có thể dùng
exports.getGHTKFee = getGHTKFee;