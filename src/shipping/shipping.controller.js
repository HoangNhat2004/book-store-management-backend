const axios = require('axios');

// --- CẤU HÌNH GHTK (ĐANG Ở CHẾ ĐỘ TEST TẠM THỜI) ---
// const GHTK_TOKEN = "TOKEN_CUA_BAN"; 
// const GHTK_URL = "https://services-staging.ghtklab.com/services/shipment/fee";

// === GIẢI PHÁP TẠM THỜI (CHỜ GHTK HỖ TRỢ) ===
// Đặt là 'true' để bỏ qua GHTK và dùng phí cố định
const GHTK_TESTING_MODE = true; 
const GHTK_TEST_FEE = 30000; // Phí giả định là 30,000 VND
// ============================================


/**
 * Hàm nội bộ để gọi GHTK và lấy phí
 */
async function getGHTKFee(address, weight = 500) { 
    
    // --- LÔGIC TẠM THỜI ---
    if (GHTK_TESTING_MODE) {
        console.warn("GHTK_TESTING_MODE is ON. Returning test fee:", GHTK_TEST_FEE);
        return GHTK_TEST_FEE;
    }
    // --- KẾT THÚC ---

    /*
    // (Logic thật - Tạm thời bị vô hiệu hóa)
    const GHTK_TOKEN = process.env.GHTK_TOKEN; // (Hoặc token hardcode)
    const GHTK_URL = "https://services-staging.ghtklab.com/services/shipment/fee";
    
    if (!GHTK_TOKEN) {
        console.warn("GHTK_TOKEN is not set. Returning 0 fee.");
        return 0; 
    }
    // ... (logic gọi axios thật)
    */

    // Trả về 0 nếu không ở chế độ test
    return 0;
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