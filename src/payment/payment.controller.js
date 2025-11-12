const querystring = require('qs');
const crypto = require('crypto');
const moment = require('moment');
const Order = require('../orders/order.model');

// --- THÔNG TIN CẤU HÌNH VNPAY (HARDCODED) ---
const vnp_TmnCode = "7DAGZ72F";
const vnp_HashSecret = "E5ELR53OCM8YIT2G9EPY42KUVLGRWDWV";
const vnp_Url = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const vnp_ReturnUrl = "https://book-store-management-frontend-delta.vercel.app/orders";
// --- KẾT THÚC CẤU HÌNH ---

// --- TỶ GIÁ (Lưu trữ an toàn trên backend) ---
// LƯU Ý: Tỷ giá này vẫn đang bị hardcode.
// Trong tương lai, bạn nên gọi API tỷ giá ngân hàng tại đây.
const EXCHANGE_RATE_USD_TO_VND = 25000;
// ---

// HÀM TẠO URL THANH TOÁN (ĐÃ SỬA LỖI BẢO MẬT)
exports.createPaymentUrl = async (req, res) => {
    try {
        process.env.TZ = 'Asia/Ho_Chi_Minh'; // Set múi giờ VN

        // 1. CHỈ NHẬN orderId TỪ FRONTEND. KHÔNG TIN TƯỞNG SỐ TIỀN.
        const { orderId, language = 'vn' } = req.body;
        
        if (!orderId) {
            return res.status(400).json({ message: "Order ID is required" });
        }

        // 2. TÌM ĐƠN HÀNG TRONG CSDL ĐỂ LẤY GIÁ TRỊ THẬT
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        if (order.status !== 'Pending') {
            return res.status(400).json({ message: "Order is not pending" });
        }

        // 3. TÍNH TOÁN SỐ TIỀN THANH TOÁN TẠI BACKEND
        const totalInUSD = order.totalPrice;
        const amountInVND = Math.round(totalInUSD * EXCHANGE_RATE_USD_TO_VND);

        // --- Bắt đầu logic tạo URL của VNPay ---
        const ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        
        const tmnCode = vnp_TmnCode;
        const secretKey = vnp_HashSecret;
        let vnpUrl = vnp_Url;
        const returnUrl = vnp_ReturnUrl;

        const createDate = moment(new Date()).format('YYYYMMDDHHmmss');
        
        let vnp_Params = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = tmnCode;
        // 4. SỬ DỤNG SỐ TIỀN ĐÃ TÍNH TOÁN AN TOÀN TRÊN SERVER
        vnp_Params['vnp_Amount'] = amountInVND * 100; // * 100
        vnp_Params['vnp_CreateDate'] = createDate;
        vnp_Params['vnp_CurrCode'] = 'VND';
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_Locale'] = language;
        vnp_Params['vnp_OrderInfo'] = 'Thanh toan don hang ' + orderId;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_ReturnUrl'] = returnUrl;
        vnp_Params['vnp_TxnRef'] = orderId;

        vnp_Params = sortObject(vnp_Params);

        const signData = querystring.stringify(vnp_Params, { encode: false });
        const hmac = crypto.createHmac("sha512", secretKey);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
        vnp_Params['vnp_SecureHash'] = signed;

        vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });
        
        res.status(200).json({ url: vnpUrl });

    } catch (error) {
        console.error("Error creating VNPay URL:", error);
        res.status(500).json({ message: "Failed to create payment URL" });
    }
};

// HÀM NHẬN CALLBACK TỪ VNPAY (IPN) - (Giữ nguyên)
exports.vnpayIpn = async (req, res) => {
    let vnp_Params = req.query;
    let secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);
    
    const secretKey = vnp_HashSecret;
    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

    if (secureHash === signed) {
        const orderId = vnp_Params['vnp_TxnRef'];
        const responseCode = vnp_Params['vnp_ResponseCode'];

        try {
            const order = await Order.findById(orderId);
            if (order) {
                if (order.status === 'Pending') {
                    if (responseCode === '00') {
                        order.status = 'Processing'; 
                    } else {
                        order.status = 'Cancelled';
                    }
                    await order.save();
                }
                res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
            } else {
                res.status(200).json({ RspCode: '01', Message: 'Order not found' });
            }
        } catch (error) {
            console.error("Error processing IPN:", error);
            res.status(200).json({ RspCode: '97', Message: 'Internal Error' });
        }
    } else {
        res.status(200).json({ RspCode: '97', Message: 'Invalid Signature' });
    }
};

// HÀM XỬ LÝ KHI NGƯỜI DÙNG QUAY VỀ - (Giữ nguyên)
exports.vnpayReturn = (req, res) => {
    const queryParams = querystring.stringify(req.query, { encode: false });
    res.redirect(`${vnp_ReturnUrl}?${queryParams}`);
};

// Hàm tiện ích sắp xếp object A-Z - (Giữ nguyên)
function sortObject(obj) {
    let sorted = {};
    let str = [];
    let key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            str.push(encodeURIComponent(key));
        }
    }
    str.sort();
    for (key = 0; key < str.length; key++) {
        sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
    }
    return sorted;
}