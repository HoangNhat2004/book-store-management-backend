// src/carts/cart.controller.js
const Cart = require("./cart.model");
const User = require("../users/user.model");

// 1. Lấy giỏ hàng (ĐÃ SỬA: TỰ ĐỘNG XÓA SÁCH RÁC)
const getCart = async (req, res) => {
    try {
        const email = req.user.email;
        const user = await User.findOne({ email });
        if (!user) return res.status(404).json({ message: "User not found" });

        const cart = await Cart.findOne({ userId: user._id })
            .populate({
                path: 'items.productId',
                populate: { path: 'category', select: 'name' } 
            });
        
        if (!cart) {
            return res.status(200).json({ items: [] });
        }

        // --- LOGIC MỚI: Lọc bỏ các item mà sách đã bị xóa (productId = null) ---
        // Khi populate, nếu sách không còn tồn tại, mongoose sẽ trả về null
        const validItems = cart.items.filter(item => item.productId != null);

        // Nếu số lượng item hợp lệ KHÁC số lượng ban đầu -> Có sách rác -> Cần lưu lại DB
        if (validItems.length !== cart.items.length) {
            cart.items = validItems;
            await cart.save();
            console.log("System cleaned up ghost items from cart for user:", email);
        }
        // ----------------------------------------------------------------------

        res.status(200).json(cart);
    } catch (error) {
        console.error("Get Cart Error:", error);
        res.status(500).json({ message: "Failed to get cart" });
    }
};

// 2. Thêm vào giỏ (Giữ nguyên)
const addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const email = req.user.email;
        
        let user = await User.findOne({ email });
        if (!user) {
             user = new User({ email, username: email.split('@')[0], password: 'auto_gen_cart', role: 'user' });
             await user.save();
        }

        let cart = await Cart.findOne({ userId: user._id });

        if (!cart) {
            cart = new Cart({
                userId: user._id,
                items: [{ productId, quantity }]
            });
        } else {
            const itemIndex = cart.items.findIndex(p => p.productId.toString() === productId);
            if (itemIndex > -1) {
                cart.items[itemIndex].quantity += quantity;
            } else {
                cart.items.push({ productId, quantity });
            }
        }
        
        await cart.save();
        res.status(200).json({ message: "Item added to cart", cart });
    } catch (error) {
        console.error("Add Cart Error:", error);
        res.status(500).json({ message: "Failed to add to cart" });
    }
};

// 3. Cập nhật số lượng (Giữ nguyên)
const updateCartItem = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const email = req.user.email;
        const user = await User.findOne({ email });
        
        const cart = await Cart.findOne({ userId: user._id });
        if (!cart) return res.status(404).json({ message: "Cart not found" });

        const itemIndex = cart.items.findIndex(p => p.productId.toString() === productId);
        if (itemIndex > -1) {
            if (quantity > 0) {
                cart.items[itemIndex].quantity = quantity;
            } else {
                cart.items.splice(itemIndex, 1);
            }
            await cart.save();
            res.status(200).json({ message: "Cart updated", cart });
        } else {
            res.status(404).json({ message: "Item not found" });
        }
    } catch (error) {
        res.status(500).json({ message: "Failed to update cart" });
    }
};

// 4. Xóa giỏ hàng (Giữ nguyên)
const clearCart = async (req, res) => {
    try {
        const email = req.user.email;
        const user = await User.findOne({ email });
        if (user) {
            await Cart.findOneAndDelete({ userId: user._id });
        }
        res.status(200).json({ message: "Cart cleared" });
    } catch (error) {
        res.status(500).json({ message: "Failed to clear cart" });
    }
};

module.exports = { getCart, addToCart, updateCartItem, clearCart };