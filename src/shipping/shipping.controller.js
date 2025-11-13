const axios = require('axios'); // (Vẫn giữ, phòng khi cần)

// === BẮT ĐẦU LOGIC MOCK PHÍ SHIP ===

// Địa chỉ kho của bạn
const WAREHOUSE_STATE = "Thành phố Hồ Chí Minh";

// Danh sách các quận nội thành TPHCM (để tính phí rẻ hơn)
const HCM_INNER_CITY = [
    "Quận 1", "Quận 3", "Quận 4", "Quận 5", "Quận 6",
    "Quận 10", "Quận 11", "Quận Bình Thạnh", "Quận Phú Nhuận",
    "Quận Gò Vấp", "Quận Tân Bình", "Quận Tân Phú"
];

// Các tỉnh/thành phố lớn khác (để có giá riêng)
const MAJOR_CITIES = ["Hà Nội", "Đà Nẵng"];

/**
 * Hàm MOCK (giả lập) tính phí vận chuyển dựa trên địa chỉ
 * @param {object} address - Địa chỉ người nhận (state: Tỉnh, city: Quận)
 * @returns {number} Phí vận chuyển (VND)
 */
async function getMockGHTKFee(address) {
    // (Chúng ta không cần 'weight' nữa vì đây là mock)
    
    const toState = address.state; // Tỉnh/TP người nhận
    const toCity = address.city;   // Quận/Huyện người nhận

    try {
        // Trường hợp 1: Giao tại TPHCM
        if (toState.toLowerCase().includes("hồ chí minh")) {
            
            // 1a: Giao nội thành TPHCM
            if (HCM_INNER_CITY.some(innerCity => toCity.toLowerCase().includes(innerCity.toLowerCase().replace("quận ", "")))) {
                console.log("Mock Fee: HCM Inner City (20,000 VND)");
                return 20000; 
            }
            // 1b: Giao ngoại thành TPHCM (ví dụ: Huyện Nhà Bè, Củ Chi, Thủ Đức)
            console.log("Mock Fee: HCM Suburban (30,000 VND)");
            return 30000; 
        }

        // Trường hợp 2: Giao đến các thành phố lớn khác (Hà Nội, Đà Nẵng)
        if (MAJOR_CITIES.some(majorCity => toState.toLowerCase().includes(majorCity.toLowerCase()))) {
            console.log("Mock Fee: Major City (35,000 VND)");
            return 35000; 
        }

        // Trường hợp 3: Giao đến tất cả các tỉnh còn lại
        console.log("Mock Fee: Other Province (45,000 VND)");
        return 45000; 

    } catch (error) {
        console.error("Mock fee calculation error:", error);
        return 0; // Trả về 0 nếu có lỗi
    }
}
// === KẾT THÚC LOGIC MOCK PHÍ SHIP ===


// API Endpoint (được gọi bởi frontend)
exports.calculateFee = async (req, res) => {
    const { address } = req.body;
    if (!address || !address.city || !address.state) {
        return res.status(400).json({ message: "Address details (city, state) are required" });
    }
    
    // Gọi hàm mock (thay vì GHTK thật)
    const fee = await getMockGHTKFee(address);
    res.status(200).json({ shippingFee: fee }); // Trả về phí (VND)
};

// Xuất hàm helper để Order Controller có thể dùng
// (Order Controller giờ đây cũng sẽ dùng logic mock này, rất an toàn)
exports.getGHTKFee = getMockGHTKFee;