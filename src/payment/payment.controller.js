const querystring = require('qs');
const crypto = require('crypto');
const moment = require('moment');
const Order = require('../orders/order.model'); // Đảm bảo đường dẫn này đúng

// --- THÔNG TIN CẤU HÌNH VNPAY (HARDCODED) ---
const vnp_TmnCode = "7DAGZ72F";
const vnp_HashSecret = "E5ELR53OCM8YIT2G9EPY42KUVLGRWDWV";
const vnp_Url = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const vnp_ReturnUrl = "https://book-store-management-frontend-delta.vercel.app/orders";
// --- KẾT THÚC CẤU HÌNH ---


// HÀM TẠO URL THANH TOÁN
exports.createPaymentUrl = async (req, res) => {
    try {
        process.env.TZ = 'Asia/Ho_Chi_Minh'; // Set múi giờ VN

        const { orderId, amountInVND, language = 'vn' } = req.body;
        const ipAddr = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        
        // Sử dụng biến đã hardcode ở trên
        const tmnCode = vnp_TmnCode;
        const secretKey = vnp_HashSecret;
        let vnpUrl = vnp_Url;
        const returnUrl = vnp_ReturnUrl;

        const createDate = moment(new Date()).format('YYYYMMDDHHmmss');
        
        let vnp_Params = {};
        vnp_Params['vnp_Version'] = '2.1.0';
        vnp_Params['vnp_Command'] = 'pay';
        vnp_Params['vnp_TmnCode'] = tmnCode;
        vnp_Params['vnp_Amount'] = amountInVND * 100; // VNPay tính bằng đơn vị 'đồng' * 100
        vnp_Params['vnp_CreateDate'] = createDate;
        vnp_Params['vnp_CurrCode'] = 'VND';
        vnp_Params['vnp_IpAddr'] = ipAddr;
        vnp_Params['vnp_Locale'] = language;
        vnp_Params['vnp_OrderInfo'] = 'Thanh toan don hang ' + orderId;
        vnp_Params['vnp_OrderType'] = 'other';
        vnp_Params['vnp_ReturnUrl'] = returnUrl;
        vnp_Params['vnp_TxnRef'] = orderId; // Mã đơn hàng của bạn

        // Sắp xếp các tham số theo A-Z (bắt buộc)
        vnp_Params = sortObject(vnp_Params);

        // Tạo chữ ký bảo mật
        const signData = querystring.stringify(vnp_Params, { encode: false });
        const hmac = crypto.createHmac("sha512", secretKey);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");
        vnp_Params['vnp_SecureHash'] = signed;

        // Tạo URL thanh toán
        vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });
        
        res.status(200).json({ url: vnpUrl });

    } catch (error) {
        console.error("Error creating VNPay URL:", error);
        res.status(500).json({ message: "Failed to create payment URL" });
    }
};

// HÀM NHẬN CALLBACK TỪ VNPAY (IPN)
exports.vnpayIpn = async (req, res) => {
    let vnp_Params = req.query;
    let secureHash = vnp_Params['vnp_SecureHash'];

    // Xóa hash và hashType khỏi params để kiểm tra chữ ký
    delete vnp_Params['vnp_SecureHash'];
    delete vnp_Params['vnp_SecureHashType'];

    vnp_Params = sortObject(vnp_Params);
    
    // Sử dụng biến đã hardcode
    const secretKey = vnp_HashSecret;
    const signData = querystring.stringify(vnp_Params, { encode: false });
    const hmac = crypto.createHmac("sha512", secretKey);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest("hex");

    // 1. Kiểm tra chữ ký
    if (secureHash === signed) {
        const orderId = vnp_Params['vnp_TxnRef'];
        const responseCode = vnp_Params['vnp_ResponseCode'];

        try {
            // 2. Tìm đơn hàng
            const order = await Order.findById(orderId);
            if (order) {
                // 3. Chỉ cập nhật nếu đơn hàng đang "Pending"
                if (order.status === 'Pending') {
                    if (responseCode === '00') {
                        // Thanh toán thành công
                        order.status = 'Processing'; // Chuyển sang "Đang xử lý"
                    } else {
                        // Thanh toán thất bại
                        order.status = 'Cancelled';
                    }
                    await order.save();
                }
                // Báo cho VNPay là đã nhận (dù thành công hay thất bại)
                res.status(200).json({ RspCode: '00', Message: 'Confirm Success' });
            } else {
                res.status(200).json({ RspCode: '01', Message: 'Order not found' });
            }
        } catch (error) {
            console.error("Error processing IPN:", error);
            res.status(200).json({ RspCode: '97', Message: 'Internal Error' });
        }
    } else {
        // Chữ ký không hợp lệ
        res.status(200).json({ RspCode: '97', Message: 'Invalid Signature' });
    }
};

// HÀM XỬ LÝ KHI NGƯỜI DÙNG QUAY VỀ
exports.vnpayReturn = (req, res) => {
    // Logic này chỉ để chuyển hướng người dùng về trang frontend.
    // Mọi logic cập nhật CSDL phải nằm ở vnpayIpn.
    
    // Lấy các query params từ VNPay
    const queryParams = querystring.stringify(req.query, { encode: false });
    
    // Sử dụng biến đã hardcode
    const returnUrl = vnp_ReturnUrl;
    
    // Chuyển hướng về trang Orders của frontend KÈM THEO các query params
    res.redirect(`${returnUrl}?${queryParams}`);
};

// Hàm tiện ích sắp xếp object A-Z
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