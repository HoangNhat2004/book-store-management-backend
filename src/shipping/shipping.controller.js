// hoangnhat2004/book-store-management-backend/book-store-management-backend-b65cc36d05661fcf23898464f45f3f2fa510ea65/src/shipping/shipping.controller.js

const axios = require('axios');

// Đọc Token và ShopID Test từ .env (VẪN CẦN)
const GHN_TOKEN = "5dc08005-c3c9-11f0-a621-f2a9392e54c8";
const GHN_SHOP_ID = parseInt("198148", 10);

const GHN_FEE_API_URL = "https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order/fee";
const GHN_MASTER_DATA_API_URL = "https://dev-online-gateway.ghn.vn/shiip/public-api/master-data";

// Đây là địa chỉ kho lấy hàng mặc định (Ví dụ: Quận 1, TP.HCM)
const FROM_DISTRICT_ID = 1442; // ID Quận 1
const FROM_WARD_CODE = "20109";  // Mã Phường Bến Nghé

/**
 * Hàm nội bộ để gọi GHN và lấy phí (ĐÃ SỬA)
 * @param {number} to_district_id - ID Quận/Huyện của người nhận
 * @param {string} to_ward_code - Mã Phường/Xã của người nhận
 * @param {number} weight - Cân nặng (gram)
 * @returns {number} Phí vận chuyển (VND)
 */
async function getGHNFee(to_district_id, to_ward_code, weight = 500) {
    
    if (!GHN_TOKEN || !GHN_SHOP_ID) {
        console.error("GHN Token hoặc Shop ID chưa được cấu hình trong .env");
        throw new Error("Hệ thống vận chuyển chưa sẵn sàng.");
    }
    
    if (!to_district_id || !to_ward_code) {
        // Nếu frontend chưa kịp nâng cấp, trả về phí tạm
        console.warn("Thiếu district_id hoặc ward_code, trả về phí tạm 30000 VND");
        return 30000;
        // throw new Error("GHN requires District ID and Ward Code.");
    }

    const payload = {
        "service_type_id": 2,   // (Số 2 = Giao hàng chuẩn)
        "to_district_id": parseInt(to_district_id, 10),
        "to_ward_code": to_ward_code.toString(),
        "weight": parseInt(weight, 10),
        
        // GÁN CỨNG ĐỊA CHỈ LẤY HÀNG
        "from_district_id": FROM_DISTRICT_ID,
        "from_ward_code": FROM_WARD_CODE,

        "height": 15, // Giả định
        "length": 15, // Giả định
        "width": 15,  // Giả định
        "insurance_value": 0,
    };

    try {
        const response = await axios.post(GHN_FEE_API_URL, payload, {
            headers: {
                'Token': GHN_TOKEN,
                'ShopId': GHN_SHOP_ID, // Vẫn bắt buộc phải có ShopId trong header
                'Content-Type': 'application/json'
            }
        });

        if (response.data && response.data.data && response.data.data.total) {
            console.log("GHN Fee Calculated:", response.data.data.total); // Thêm log
            return response.data.data.total; // Trả về phí (VND)
        }
        
        console.warn("GHN API OK but no fee found:", response.data);
        return 0;

    } catch (error) {
        console.error("GHN API Error (calculateFee):", error.response?.data?.message || error.message);
        // Trả về một mức phí mặc định nếu có lỗi
        return 30000; 
    }
}

// API Endpoint: Tính phí (Frontend gọi vào đây)
exports.calculateFee = async (req, res) => {
    const { to_district_id, to_ward_code, weight } = req.body;
    
    if (!to_district_id || !to_ward_code) {
        return res.status(400).json({ message: "District ID and Ward Code are required" });
    }
    
    try {
        const fee = await getGHNFee(to_district_id, to_ward_code, weight || 500); 
        res.status(200).json({ shippingFee: fee }); // Trả về phí (VND)
    } catch (error) {
        res.status(500).json({ message: error.message || "Failed to calculate fee" });
    }
};

// API Endpoint: Lấy Tỉnh/Thành phố
exports.getProvinces = async (req, res) => {
    try {
        const response = await axios.get(`${GHN_MASTER_DATA_API_URL}/province`, {
            headers: { 'Token': GHN_TOKEN }
        });
        res.status(200).json(response.data);
    } catch (error) {
        console.error("GHN Error (Provinces):", error.response?.data?.message || error.message);
        res.status(500).json({ message: "Failed to fetch provinces" });
    }
};

// API Endpoint: Lấy Quận/Huyện
exports.getDistricts = async (req, res) => {
    const { province_id } = req.body; 
    if (!province_id) {
        return res.status(400).json({ message: "Province ID is required" });
    }
    try {
        const response = await axios.post(`${GHN_MASTER_DATA_API_URL}/district`, 
            { province_id: parseInt(province_id, 10) }, // Đảm bảo province_id là số
            { headers: { 'Token': GHN_TOKEN } }
        );
        res.status(200).json(response.data);
    } catch (error) {
        console.error("GHN Error (Districts):", error.response?.data?.message || error.message);
        res.status(500).json({ message: "Failed to fetch districts" });
    }
};

// API Endpoint: Lấy Phường/Xã
exports.getWards = async (req, res) => {
    const { district_id } = req.body; 
    if (!district_id) {
        return res.status(400).json({ message: "District ID is required" });
    }
    try {
        const response = await axios.post(`${GHN_MASTER_DATA_API_URL}/ward`, 
            { district_id: parseInt(district_id, 10) }, // Đảm bảo district_id là số
            { headers: { 'Token': GHN_TOKEN } }
        );
        res.status(200).json(response.data);
    } catch (error) {
        console.error("GHN Error (Wards):", error.response?.data?.message || error.message);
        res.status(500).json({ message: "Failed to fetch wards" });
    }
};

// Xuất hàm helper để Order Controller có thể dùng
exports.getGHNFee = getGHNFee;