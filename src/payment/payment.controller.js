// src/payment/payment.controller.js
const querystring = require('qs');
const crypto = require('crypto');
const moment = require('moment');
const Order = require('../orders/order.model');
const axios = require('axios'); // <-- ĐÃ THÊM AXIOS (Fix lỗi crash khi lấy tỷ giá)

// --- THÔNG TIN CẤU HÌNH VNPAY ---
const vnp_TmnCode = "7DAGZ72F";
const vnp_HashSecret = "E5ELR53OCM8YIT2G9EPY42KUVLGRWDWV";
const vnp_Url = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

// URL Mặc định (Fallback) nếu không lấy được Origin
const DEFAULT_RETURN_URL = "https://book-store-management-frontend-delta.vercel.app/orders";

// --- 2. LOGIC LẤY TỶ GIÁ ĐỘNG ---
const FALLBACK_EXCHANGE_RATE = 25000; 
const EXCHANGE_RATE_API_URL = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json";

async function getLiveExchangeRate() {
    try {
        const response = await axios.get(EXCHANGE_RATE_API_URL, { timeout: 3000 });
        const rate = response.data?.usd?.vnd;
        
        if (rate && typeof rate === 'number') {
            return rate;
        }
        throw new Error("Invalid API response structure");
    } catch (error) {
        console.error("Failed to fetch live exchange rate, using fallback.", error.message);
        return FALLBACK_EXCHANGE_RATE;
    }
}

// HÀM TẠO URL THANH TOÁN (PROFESSIONAL VERSION)
exports.createPaymentUrl = async (req, res) => {
    try {
        process.env.TZ = 'Asia/Ho_Chi_Minh'; 

        const { orderId, language = 'vn' } = req.body;
        
        if (!orderId) {
            return res.status(400).json({ message: "Order ID is required" });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        
        // --- LOGIC TỰ ĐỘNG XÁC ĐỊNH URL TRẢ VỀ ---
        // Lấy domain của người gọi (localhost hoặc vercel) từ header 'origin' hoặc 'referer'
        const clientOrigin = req.headers.origin || req.headers.referer;
        
        let returnUrl = DEFAULT_RETURN_URL;
        
        if (clientOrigin) {
            // Loại bỏ dấu / ở cuối nếu có để tránh lỗi nối chuỗi (ví dụ: localhost:5173/)
            const cleanOrigin = clientOrigin.endsWith('/') ? clientOrigin.slice(0, -1) : clientOrigin;
            returnUrl = `${cleanOrigin}/orders`;
        }
        
        console.log("VNPay Return URL set to:", returnUrl); 
        // ------------------------------------------

        // Lấy tỷ giá và tính toán tiền
        const liveRate = await getLiveExchangeRate();
        const totalInUSD = order.totalPrice;
        const amountInVND = Math.round(totalInUSD * liveRate); 

        // Config VNPay Params
        const ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const createDate = moment(new Date()).format('YYYYMMDDHHmmss');
        
        let vnp_Params = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = vnp_TmnCode;
        vnp_Params['vnp_Locale'] = language;
        vnp_Params['vnp_CurrCode'] = 'VND';
        vnp_Params['vnp_TxnRef'] = orderId;
        vnp_Params['vnp_OrderInfo'] = 'Thanh toan don hang ' + orderId;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_Amount'] = amountInVND * 100; 
        vnp_Params['vnp_ReturnUrl'] = returnUrl; // URL động đã xử lý ở trên
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_CreateDate'] = createDate;

        vnp_Params = sortObject(vnp_Params);

        const signData = querystring.stringify(vnp_Params, { encode: false });
        const hmac = crypto.createHmac("sha512", vnp_HashSecret);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
        vnp_Params['vnp_SecureHash'] = signed;

        const paymentUrl = vnp_Url + '?' + querystring.stringify(vnp_Params, { encode: false });
        
        res.status(200).json({ url: paymentUrl });

    } catch (error) {
        console.error("Error creating VNPay URL:", error);
        res.status(500).json({ message: "Failed to create payment URL" });
    }
};

// HÀM NHẬN CALLBACK (IPN) - GIỮ NGUYÊN
exports.vnpayIpn = async (req, res) => {
    let vnp_Params = req.query;
    let secureHash = vnp_Params['vnp_SecureHash'];

    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);
    
    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", vnp_HashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

    if (secureHash === signed) {
        const orderId = vnp_Params['vnp_TxnRef'];
        const responseCode = vnp_Params['vnp_ResponseCode'];

        try {
            const order = await Order.findById(orderId);
            if (order) {
                if (order.status === 'Pending') { // Chỉ update nếu chưa xử lý
                    if (responseCode === '00') {
                        order.status = 'Processing'; 
                    } else {
                        // Nếu thất bại/hủy nhưng không muốn hủy đơn thì comment dòng dưới
                        // order.status = 'Cancelled'; 
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

// HÀM RETURN (REDIRECT VỀ FRONTEND) - CŨNG CẦN ĐỘNG
// Tuy nhiên, hàm này thường chỉ dùng cho server-side render. 
// Với React App, VNPay thường redirect thẳng về `vnp_ReturnUrl` do `createPaymentUrl` quy định.
// Nên hàm này ít khi được gọi trực tiếp trừ khi cấu hình sai.
exports.vnpayReturn = (req, res) => {
    // Logic này giữ nguyên, nhưng thực tế vnp_ReturnUrl ở trên mới quyết định
    const queryParams = querystring.stringify(req.query, { encode: false });
    res.redirect(`${DEFAULT_RETURN_URL}?${queryParams}`);
};

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