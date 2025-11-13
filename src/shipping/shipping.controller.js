const axios = require('axios');

// --- THÔNG TIN CẤU HÌNH GHTK (TOKEN "ĐÃ DUYỆT") ---
const GHTK_TOKEN = "336lGYNGTsQyVFLavEmacVpq3ScskF05xxob07kO"; // <-- Token "lGY"
const GHTK_URL = "https://services-staging.ghtklab.com/services/shipment/fee";
// --- KẾT THÚC CẤU HÌNH ---

/**
 * Hàm nội bộ để gọi GHTK và lấy phí
 */
async function getGHTKFee(address, weight = 500) { 
    if (!GHTK_TOKEN) {
        console.warn("GHTK_TOKEN is not set. Returning 0 fee.");
        return 0; 
    }

    const payload = {
        "pick_province": "Thành phố Hồ Chí Minh", 
        "pick_district": "Quận 1", 
        "province": address.state || address.country, 
        "district": address.city, 
        "address": address.address || address.city,
        "weight": weight,
        "transport": "road" 
    };

    try {
        // --- DÒNG KIỂM TRA MỚI ---
        console.log("--- GHTK TOKEN ĐANG DÙNG ---");
        console.log(GHTK_TOKEN);
        // --- KẾT THÚC DÒNG KIỂM TRA ---

        const response = await axios.post(GHTK_URL, payload, {
            headers: { 'Token': GHTK_TOKEN } 
        });

        if (response.data && response.data.fee && response.data.fee.fee) {
            console.log("GHTK Fee received (VND):", response.data.fee.fee);
            return response.data.fee.fee;
        }
        console.warn("GHTK Response OK, but no fee found:", response.data);
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
    
    const fee = await getGHTKFee(address, 500);
    res.status(200).json({ shippingFee: fee });
};

// Xuất hàm helper để Order Controller có thể dùng
exports.getGHTKFee = getGHTKFee;