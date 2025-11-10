// backend/src/orders/order.controller.js
const Order = require("./order.model");
const Book = require("../books/book.model");

const createAOrder = async (req, res) => {
  try {
    // 2. Tách productIds và quantities khỏi req.body
    const { productIds, quantities, ...otherData } = req.body;

    // 3. Lấy thông tin đầy đủ của các sách từ DB
    const books = await Book.find({ _id: { $in: productIds } });

    // 4. Tạo Map để tra cứu sách nhanh
    const bookMap = new Map(books.map(book => [book._id.toString(), book]));

    // 5. Xây dựng mảng 'items' với dữ liệu đã sao chép
    const items = productIds.map((id, index) => {
        const book = bookMap.get(id);
        if (!book) {
            // Trường hợp sách không tìm thấy (mặc dù hiếm khi xảy ra nếu frontend làm đúng)
            throw new Error(`Product with ID ${id} not found`);
        }
        return {
            productId: id,
            title: book.title,
            price: book.newPrice, // <-- Quan trọng: Sao chép giá tại thời điểm mua
            quantity: quantities[index] || 1
        };
    });

    // 6. Tạo đơn hàng mới với mảng 'items' đã hoàn chỉnh
    const newOrder = new Order({
        ...otherData,
        items: items, // <-- Gán mảng items mới
        // productIds và quantities không còn được lưu ở cấp cao nhất
    });

    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (error) {
    console.error("Error creating order", error);
    res.status(500).json({ message: "Failed to create order" });
  }
};

const getOrderByEmail = async (req, res) => {
  try {
    const { email } = req.params;
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

// THÊM: LẤY TẤT CẢ ĐƠN HÀNG (ADMIN)
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
  getAllOrders, // XUẤT RA
};