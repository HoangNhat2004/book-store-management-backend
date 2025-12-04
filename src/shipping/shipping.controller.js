// src/shipping/shipping.controller.js
const axios = require('axios');
const Order = require('../orders/order.model'); // Import Order Model để cập nhật mã vận đơn

// --- CẤU HÌNH GHN ---
const GHN_TOKEN = "5dc08005-c3c9-11f0-a621-f2a9392e54c8"; // Token của bạn
const GHN_SHOP_ID = 198148; // ShopID của bạn
const GHN_API_BASE = "https://dev-online-gateway.ghn.vn/shiip/public-api/v2/shipping-order";
const GHN_MASTER_DATA = "https://dev-online-gateway.ghn.vn/shiip/public-api/master-data";

// Địa chỉ kho mặc định (Quận 1)
const FROM_DISTRICT_ID = 1442; 
const FROM_WARD_CODE = "20109";

// --- 1. HÀM HELPER TÍNH PHÍ (Dùng nội bộ và export) ---
async function getGHNFee(to_district_id, to_ward_code, weight = 500) {
    if (!to_district_id || !to_ward_code) return 30000;

    try {
        const response = await axios.post(`${GHN_API_BASE}/fee`, {
            service_type_id: 2, // Giao chuẩn
            insurance_value: 0,
            coupon: null,
            from_district_id: FROM_DISTRICT_ID,
            to_district_id: parseInt(to_district_id),
            to_ward_code: String(to_ward_code),
            height: 15, length: 15, width: 15, weight: parseInt(weight)
        }, {
            headers: { 'Token': GHN_TOKEN, 'ShopId': GHN_SHOP_ID }
        });
        return response.data.data.total || 0;
    } catch (error) {
        console.error("GHN Calc Fee Error:", error.response?.data?.message || error.message);
        return 30000; // Phí mặc định nếu lỗi
    }
}

// --- 2. CÁC API CHO FRONTEND (Địa chỉ & Phí) ---

exports.calculateFee = async (req, res) => {
    const { to_district_id, to_ward_code, weight } = req.body;
    try {
        const fee = await getGHNFee(to_district_id, to_ward_code, weight);
        res.status(200).json({ shippingFee: fee });
    } catch (error) {
        res.status(500).json({ message: "Failed to calculate fee" });
    }
};

exports.getProvinces = async (req, res) => {
    try {
        const response = await axios.get(`${GHN_MASTER_DATA}/province`, { headers: { 'Token': GHN_TOKEN } });
        res.status(200).json(response.data);
    } catch (e) { res.status(500).json({ message: "Error fetching provinces" }); }
};

exports.getDistricts = async (req, res) => {
    try {
        const response = await axios.post(`${GHN_MASTER_DATA}/district`, 
            { province_id: parseInt(req.body.province_id) }, 
            { headers: { 'Token': GHN_TOKEN } }
        );
        res.status(200).json(response.data);
    } catch (e) { res.status(500).json({ message: "Error fetching districts" }); }
};

exports.getWards = async (req, res) => {
    try {
        const response = await axios.post(`${GHN_MASTER_DATA}/ward`, 
            { district_id: parseInt(req.body.district_id) }, 
            { headers: { 'Token': GHN_TOKEN } }
        );
        res.status(200).json(response.data);
    } catch (e) { res.status(500).json({ message: "Error fetching wards" }); }
};

// --- SỬA HÀM TẠO ĐƠN SHIP ---
exports.createShippingOrder = async (req, res) => {
    try {
        const { orderId } = req.body;
        const order = await Order.findById(orderId);

        if (!order) return res.status(404).json({ message: "Order not found" });
        if (order.ghnOrderCode) return res.status(400).json({ message: "Order already pushed" });

        // 1. Kiểm tra dữ liệu địa chỉ (Quan trọng)
        if (!order.address.district_id || !order.address.ward_code) {
            return res.status(400).json({ 
                message: "Missing Address IDs in Order. Cannot push to GHN.",
                detail: "Order was created before updating Order Model. Please create a new order."
            });
        }

        // 2. Chuẩn hóa số điện thoại
        let formattedPhone = String(order.phone);
        // Xóa các ký tự không phải số
        formattedPhone = formattedPhone.replace(/\D/g, '');
        // Đảm bảo bắt đầu bằng 0 và đủ 10 số (cơ bản)
        if (!formattedPhone.startsWith('0')) formattedPhone = '0' + formattedPhone;
        
        if (formattedPhone.length < 10) {
             return res.status(400).json({ message: `Phone number invalid (${formattedPhone}). Must be at least 10 digits.` });
        }

        // 3. Payload
        const items = order.items.map(item => ({
            name: item.title,
            quantity: item.quantity,
            price: 0,
            weight: 200
        }));

        const payload = {
            payment_type_id: 1,
            note: "Call before delivery",
            required_note: "CHOXEMHANGKHONGTHU",
            to_name: order.name,
            to_phone: formattedPhone,
            to_address: order.address.address,
            to_ward_code: String(order.address.ward_code),
            to_district_id: Number(order.address.district_id),
            weight: 200 * items.length,
            length: 10, width: 10, height: 10,
            service_type_id: 2,
            items: items
        };

        console.log("Pushing to GHN:", payload);

        const response = await axios.post(`${GHN_API_BASE}/create`, payload, {
            headers: {
                'Token': GHN_TOKEN,
                'ShopId': GHN_SHOP_ID,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.code === 200) {
            const ghnCode = response.data.data.order_code;
            order.ghnOrderCode = ghnCode;
            order.status = 'Shipped';
            await order.save();
            res.status(200).json({ message: "Success", ghnCode, order });
        } else {
            throw new Error(response.data.message || "GHN Error");
        }

    } catch (error) {
        const ghnMsg = error.response?.data?.message || error.message;
        console.error("GHN Create Error:", ghnMsg);
        res.status(500).json({ message: "GHN Failed: " + ghnMsg });
    }
};

// --- QUAN TRỌNG: EXPORT ĐẦY ĐỦ TẤT CẢ HÀM ---
exports.getGHNFee = getGHNFee; // Export riêng helper
// (Các hàm exports.abc = ... ở trên đã tự động được export)