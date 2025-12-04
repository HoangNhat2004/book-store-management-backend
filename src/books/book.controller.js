// src/books/book.controller.js
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

// get all books (Có tính doanh số + Populate Category)
const getAllBooks = async (req, res) => {
    try {
        // 1. Tính số lượng đã bán
        const salesData = await Order.aggregate([
            { $match: { status: { $ne: 'Cancelled' } } }, 
            { $unwind: "$items" }, 
            {
                $group: {
                    _id: "$items.productId", 
                    totalSold: { $sum: "$items.quantity" } 
                }
            }
        ]);

        const salesMap = salesData.reduce((map, item) => {
            if (item._id) { 
                 map[item._id.toString()] = item.totalSold;
            }
            return map;
        }, {});

        // 2. Lấy sách & Populate Category
        // .populate('category') giúp hiển thị tên danh mục thay vì ID
        const books = await Book.find().populate('category').sort({ createdAt: -1 }).lean(); 

        // 3. Gộp dữ liệu
        const booksWithSales = books.map(book => ({
            ...book,
            totalSold: salesMap[book._id.toString()] || 0 
        }));

        res.status(200).send(booksWithSales); 
        
    } catch (error) {
        console.error("Error fetching books", error);
        res.status(500).send({message: "Failed to fetch books"})
    }
}

const getSingleBook = async (req, res) => {
    try {
        const {id} = req.params;
        // Populate category cho trang chi tiết
        const book = await Book.findById(id).populate('category');
        if(!book){
            res.status(404).send({message: "Book not Found!"})
        }
        res.status(200).send(book)
        
    } catch (error) {
        console.error("Error fetching book", error);
        res.status(500).send({message: "Failed to fetch book"})
    }

}

// Update Book (Có lưu lịch sử giá)
const UpdateBook = async (req, res) => {
    try {
        const {id} = req.params;
        const updates = req.body;
        const oldBook = await Book.findById(id);
        if(!oldBook) return res.status(404).send({message: "Book not Found!"});

        const newPriceVal = Number(updates.newPrice);
        const oldPriceVal = Number(oldBook.newPrice);

        if (!isNaN(newPriceVal) && newPriceVal !== oldPriceVal) {
            const editorId = req.user ? req.user.id : null; 
            await PriceHistory.create({
                bookId: id,
                oldPrice: oldPriceVal,
                newPrice: newPriceVal,
                updatedBy: editorId, 
                note: updates.note || `Price update: ${oldPriceVal} -> ${newPriceVal}`
            });
            console.log(`✅ Saved history: ${oldPriceVal} -> ${newPriceVal} for Book ${id}`);
        }

        const updatedBook = await Book.findByIdAndUpdate(id, updates, {new: true});
        res.status(200).send({ message: "Book updated", book: updatedBook })
    } catch (error) {
        console.error("Error updating book", error);
        res.status(500).send({message: "Failed to update"})
    }
}

const deleteABook = async (req, res) => {
    try {
        const {id} = req.params;
        const deletedBook = await Book.findByIdAndDelete(id);
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

const getPriceHistory = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`📥 Fetching history for Book ID: ${id}`);

        const history = await PriceHistory.find({ bookId: id })
            .sort({ createdAt: -1 })
            .populate('updatedBy', 'email username'); 
            
        console.log(`📤 Found ${history.length} records`);
        res.status(200).json(history);
    } catch (error) {
        console.error("Error fetching history", error);
        res.status(500).send({ message: "Failed to fetch price history" });
    }
}

module.exports = {
    postABook,
    getAllBooks,
    getSingleBook,
    UpdateBook,
    deleteABook,
    getPriceHistory
}