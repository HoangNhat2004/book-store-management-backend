const Order = require("./order.model");
const Book = require("../books/book.model");
const mongoose = require('mongoose');
// 1. THAY ĐỔI IMPORT: Từ GHTK sang GHN
const { getGHNFee } = require('../shipping/shipping.controller');

const createAOrder = async (req, res) => {
    try {
        // 1. Lấy dữ liệu (giữ nguyên)
        const { name, email, address, phone, items: frontendItems } = req.body;

        if (!frontendItems || frontendItems.length === 0) {
            return res.status(400).json({ message: "Cart is empty" });
        }
        
        // 2. THAY ĐỔI QUAN TRỌNG: Kiểm tra address mới từ GHN
        if (!address || !address.to_district_id || !address.to_ward_code) {
            return res.status(400).json({ message: "Address (District ID, Ward Code) is required" });
        }

        // 3. Lấy ID sản phẩm (giữ nguyên)
        const productIds = frontendItems.map(item => {
            if (!mongoose.Types.ObjectId.isValid(item.productId)) {
                throw new Error(`Invalid Product ID: ${item.productId}`);
            }
            return item.productId;
        });

        // 4. Lấy thông tin sách (giữ nguyên)
        const books = await Book.find({ _id: { $in: productIds } });
        const bookMap = new Map(books.map(book => [book._id.toString(), book]));
        
        let verifiedTotalPrice = 0;
        const verifiedItems = [];
        let totalWeight = 0; // Tính tổng cân nặng (gram)

        // 5. Xác thực sản phẩm (giữ nguyên)
        for (const item of frontendItems) {
            const book = bookMap.get(item.productId);

            if (!book) {
                return res.status(404).json({ message: `Book with ID '${item.productId}' not found or has been removed.` });
            }

            const quantity = item.quantity || 1;
            
            verifiedItems.push({
                productId: book._id,
                title: book.title,
                price: book.newPrice,
                quantity: quantity
            });

            verifiedTotalPrice += book.newPrice * quantity;
            totalWeight += (500 * quantity); // Giả định 500g/sách
        }

        // 6. THAY ĐỔI: Gọi hàm getGHNFee với ID và Mã
        const feeInVND = await getGHNFee(
            address.to_district_id, 
            address.to_ward_code, 
            totalWeight
        );
        
        // 7. Quy đổi phí ship về USD (giữ nguyên)
        const EXCHANGE_RATE_USD_TO_VND = 25000;
        const shippingFeeUSD = feeInVND / EXCHANGE_RATE_USD_TO_VND;

        // 8. Tính tổng tiền (giữ nguyên)
        const grandTotalPrice = verifiedTotalPrice + shippingFeeUSD;

        for (const item of frontendItems) {
            const book = await Book.findById(item.productId);
            if (!book) throw new Error("Book not found");
            
            if (book.stock < (item.quantity || 1)) {
                return res.status(400).json({ message: `Sách "${book.title}" chỉ còn ${book.stock} cuốn.` });
            }
            
            // Trừ tồn kho
            book.stock -= (item.quantity || 1);
            await book.save();
        }

        // 9. Tạo đơn hàng (giữ nguyên, vì 'address' là object nên sẽ lưu cả ID)
        const newOrder = new Order({
            name,
            email,
            address, // Lưu toàn bộ object address (gồm cả ID và text)
            phone,
            items: verifiedItems,
            shippingFee: shippingFeeUSD,
            totalPrice: grandTotalPrice,
            status: 'Pending'
        });

        const savedOrder = await newOrder.save();
        
        // 10. Trả về (giữ nguyên)
        res.status(201).json(savedOrder);

    } catch (error) {
        console.error("Error creating order (GHN validation):", error);
        res.status(500).json({ message: error.message || "Failed to create order" });
    }
};

// ... (Các hàm getOrderByEmail và getAllOrders giữ nguyên) ...
const getOrderByEmail = async (req, res) => {
    try {
        const { email } = req.params;
        // Bỏ qua xác thực req.user.email nếu không dùng token cho route này
        // (Lưu ý: Dòng dưới này đã bị xóa xác thực token, bạn nên thêm lại nếu cần)
        const orders = await Order.find({ email })
            .sort({ createdAt: -1 });
        
        if (!orders || orders.length === 0) {
            return res.status(404).json({ message: "No orders found" });
        }
        res.status(200).json(orders);
    } catch (error) {
        console.error("Error fetching user orders:", error);
        res.status(500).json({ message: "Failed to fetch orders" });
    }
};

const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch orders" });
    }
};

// Hàm này là của logic VNPay, không liên quan đến GHN, cứ giữ nguyên
const confirmOrderPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const userEmail = req.user.email; // Cần verifyToken cho route này

        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        if (order.email !== userEmail) {
            return res.status(403).json({ message: "Forbidden: You do not own this order." });
        }

        if (order.status === 'Pending') {
            order.status = 'Processing';
            await order.save();
        }
        
        res.status(200).json({ message: "Order payment confirmed", order });

    } catch (error) {
        console.error("Error confirming payment:", error);
        res.status(500).json({ message: "Failed to confirm payment" });
    }
};

module.exports = {
    createAOrder,
    getOrderByEmail,
    getAllOrders, 
    confirmOrderPayment
};