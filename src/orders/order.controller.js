// backend/src/orders/order.controller.js
const Order = require("./order.model");
const Book = require("../books/book.model"); // <-- 1. IMPORT BOOK MODEL
const mongoose = require('mongoose'); // <-- 2. IMPORT MONGOOSE

// HÀM TẠO ĐƠN HÀNG (ĐÃ SỬA LỖI BẢO MẬT GIÁ)
const createAOrder = async (req, res) => {
  try {
    // 1. Lấy dữ liệu tối thiểu từ frontend
    const { name, email, address, phone, items: frontendItems } = req.body;

    if (!frontendItems || frontendItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }
    if (!address) {
      return res.status(400).json({ message: "Address is required" });
    }

    // 2. Lấy ID sản phẩm để tra cứu CSDL
    const productIds = frontendItems.map(item => {
      if (!mongoose.Types.ObjectId.isValid(item.productId)) {
        // Kiểm tra xem ID có hợp lệ không
        throw new Error(`Invalid Product ID: ${item.productId}`);
      }
      return item.productId;
    });

    // 3. Lấy thông tin SÁCH THẬT từ CSDL
    const books = await Book.find({ _id: { $in: productIds } });

    // 4. Tạo một "bản đồ" để tra cứu sách nhanh
    const bookMap = new Map(books.map(book => [book._id.toString(), book]));
    
    let verifiedTotalPrice = 0;
    const verifiedItems = []; // Mảng item đã được xác thực
    let totalWeight = 0; // Tính tổng cân nặng (cho GHTK)

    // 5. Xác thực từng sản phẩm
    for (const item of frontendItems) {
      const book = bookMap.get(item.productId);

      // QUAN TRỌNG: Kiểm tra xem sách có tồn tại không (tránh lỗi mua sách đã xóa)
      if (!book) {
        return res.status(404).json({ message: `Book with ID '${item.productId}' not found or has been removed.` });
      }

      // Lấy số lượng
      const quantity = item.quantity || 1;
      
      // Tạo mảng 'items' với dữ liệu (title, price) LẤY TỪ CSDL
      verifiedItems.push({
        productId: book._id,
        title: book.title, // <-- Lấy title từ CSDL
        price: book.newPrice, // <-- Lấy GIÁ MỚI NHẤT từ CSDL
        quantity: quantity
      });

      // TÍNH TOÁN tổng tiền trên SERVER (USD)
      verifiedTotalPrice += book.newPrice * quantity;
      
      // Tính tổng cân nặng (giả định 500g/sách)
      totalWeight += (500 * quantity); 
    }

    // 6. TỰ GỌI GHTK ĐỂ LẤY PHÍ SHIP (VND) MỘT CÁCH AN TOÀN
    // (Chúng ta cần import hàm getGHTKFee từ shipping.controller)
    const { getGHTKFee } = require('../shipping/shipping.controller');
    const feeInVND = await getGHTKFee(address, totalWeight);
    
    // 7. Quy đổi phí ship về USD (vì CSDL của bạn đang lưu USD)
    // (Tỷ giá này NÊN được lấy động, nhưng tạm thời hardcode)
    const EXCHANGE_RATE_USD_TO_VND = 25000;
    const shippingFeeUSD = feeInVND / EXCHANGE_RATE_USD_TO_VND;

    // 8. TÍNH TỔNG TIỀN CUỐI CÙNG (TRÊN SERVER)
    const grandTotalPrice = verifiedTotalPrice + shippingFeeUSD;

    // 9. Tạo đơn hàng mới với dữ liệu đã được XÁC THỰC
    const newOrder = new Order({
      name,
      email,
      address,
      phone,
      items: verifiedItems, // <-- Dùng mảng items an toàn
      shippingFee: shippingFeeUSD, // <-- Dùng phí ship an toàn
      totalPrice: grandTotalPrice, // <-- Dùng tổng tiền an toàn
      status: 'Pending'
    });

    const savedOrder = await newOrder.save();
    
    // 10. Trả về đơn hàng vừa tạo (với tổng tiền chính xác)
    res.status(201).json(savedOrder);

  } catch (error) {
    console.error("Error creating order (security validation):", error);
    res.status(500).json({ message: error.message || "Failed to create order" });
  }
};

const getOrderByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const userEmail = req.user.email;
    // --- LỚP BẢO VỆ MỚI ---
    // So sánh email trong token VÀ email yêu cầu trên URL
    if (email !== userEmail) {
        return res.status(403).json({ message: "Forbidden: You can only access your own orders." });
    }
    const orders = await Order.find({ email }) // Tìm đơn hàng
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

// LẤY TẤT CẢ ĐƠN HÀNG (ADMIN)
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
};

module.exports = {
  createAOrder,
  getOrderByEmail,
  getAllOrders, 
};