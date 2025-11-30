const Book = require("./book.model");
const Order = require("../orders/order.model");
const PriceHistory = require("./priceHistory.model");

const postABook = async (req, res) => {
    try {
        const newBook = await Book({...req.body});
        await newBook.save();
        res.status(200).send({message: "Book posted successfully", book: newBook})
    } catch (error) {
        console.error("Error creating book", error);
        res.status(500).send({message: "Failed to create book"})
    }
}

// get all books
const getAllBooks =  async (req, res) => {
    try {
        // a. Lấy số lượng bán được từ collection 'Orders'
        // (Chỉ tính các đơn hàng không bị "Cancelled")
        const salesData = await Order.aggregate([
            { $match: { status: { $ne: 'Cancelled' } } }, // Lọc bỏ đơn đã hủy
            { $unwind: "$items" }, // Tách các item trong mỗi order
            {
                $group: {
                    _id: "$items.productId", // Nhóm theo ID sách
                    totalSold: { $sum: "$items.quantity" } // Tính tổng số lượng
                }
            }
        ]);

        // b. Chuyển salesData thành một Map để tra cứu nhanh
        // (salesMap sẽ có dạng: { 'productId1': 10, 'productId2': 5 })
        const salesMap = salesData.reduce((map, item) => {
            if (item._id) { // Đảm bảo _id không null
                 map[item._id.toString()] = item.totalSold;
            }
            return map;
        }, {});

        // c. Lấy tất cả sách (dùng .lean() để có object JS thuần, nhanh hơn)
        const books = await Book.find().sort({ createdAt: -1}).lean(); 

        // d. Map qua sách và thêm trường 'totalSold'
        const booksWithSales = books.map(book => ({
            ...book,
            totalSold: salesMap[book._id.toString()] || 0 // Gán số lượng đã bán, hoặc 0
        }));

        res.status(200).send(booksWithSales); // Gửi dữ liệu đã gộp
        
    } catch (error) {
        console.error("Error fetching books", error);
        res.status(500).send({message: "Failed to fetch books"})
    }
}

const getSingleBook = async (req, res) => {
    try {
        const {id} = req.params;
        const book =  await Book.findById(id);
        if(!book){
            res.status(404).send({message: "Book not Found!"})
        }
        res.status(200).send(book)
        
    } catch (error) {
        console.error("Error fetching book", error);
        res.status(500).send({message: "Failed to fetch book"})
    }

}

// update book data
const UpdateBook = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // 1. Tìm sách cũ
        const oldBook = await Book.findById(id);
        if (!oldBook) return res.status(404).send({ message: "Book not Found!" });

        // 2. Nếu giá thay đổi, lưu vào lịch sử
        if (updates.newPrice && updates.newPrice !== oldBook.newPrice) {
            await PriceHistory.create({
                bookId: id,
                oldPrice: oldBook.newPrice,
                newPrice: updates.newPrice,
                changedBy: req.user.id, // Lấy từ token
                note: updates.note || "Price update" // Frontend có thể gửi kèm note
            });
        }

        // 3. Cập nhật sách
        const updatedBook = await Book.findByIdAndUpdate(id, updates, { new: true });
        
        res.status(200).send({
            message: "Book updated successfully",
            book: updatedBook
        })
    } catch (error) {
        console.error("Error updating a book", error);
        res.status(500).send({ message: "Failed to update a book" })
    }
}

const deleteABook = async (req, res) => {
    try {
        const {id} = req.params;
        const deletedBook =  await Book.findByIdAndDelete(id);
        if(!deletedBook) {
            res.status(404).send({message: "Book is not Found!"})
        }
        res.status(200).send({
            message: "Book deleted successfully",
            book: deletedBook
        })
    } catch (error) {
        console.error("Error deleting a book", error);
        res.status(500).send({message: "Failed to delete a book"})
    }
};

module.exports = {
    postABook,
    getAllBooks,
    getSingleBook,
    UpdateBook,
    deleteABook
}