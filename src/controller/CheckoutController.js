import User from "../model/user.model.js";
import Product from "../model/product.model.js";
import { errorHandler } from "../utils/errorHandler.js";
import Bid from "../model/bid.model.js";
import Order from "../model/CheckoutModel.js";


// export const checkout = async (req, res, next) => {
//   try {
//     const { userId } = req.body;

//     if (!userId) {
//       return next(errorHandler(400, "User ID is required"));
//     }

//     const user = await User.findById(userId);
//     if (!user) return next(errorHandler(404, "User not found"));

//     const cartItems = user.cartData || {};
//     const productIds = Object.keys(cartItems);

//     if (productIds.length === 0) {
//       return next(errorHandler(400, "Cart is empty"));
//     }

//     let totalAmount = 0;
//     const purchasedItems = [];

//     for (let productId of productIds) {
//       const product = await Product.findById(productId);
//       if (!product) continue; // Skip if product doesn't exist

//       const topBid = await Bid.find({ product: productId }).sort({ amount: -1 }).limit(1);
//       if (!topBid.length || String(topBid[0].bidder) !== userId) {
//         continue; // Only checkout if still highest bidder
//       }

//       const amount = cartItems[productId].amount || topBid[0].amount;

//       // Simulate "purchasing"
//       totalAmount += amount;
//       purchasedItems.push({
//         product: productId,
//         amount,
//       });

//       // Optional: Set product as sold, mark bidder, or archive product
//       // product.isSold = true;
//       // await product.save();
//     }

//     if (purchasedItems.length === 0) {
//       return next(errorHandler(400, "No valid items to checkout"));
//     }

//     // Optional: Create Order record (if you have an Order model)
//     // await Order.create({ user: userId, items: purchasedItems, totalAmount });

//     // Clear cart
//     user.cartData = {};
//     user.markModified("cartData");
//     await user.save();

//     res.status(200).json({
//       success: true,
//       message: "Checkout successful",
//       total: totalAmount,
//       items: purchasedItems,
//     });

//   } catch (error) {
//     console.error("Error in checkout:", error);
//     next(errorHandler(500, "Internal Server Error"));
//   }
// };




// Optional: A helper function to generate a sequential order number
let orderSequence = 1000; // Ideally stored in DB

 const checkout = async (req, res, next) => {
  try {
    const {
      userId,
      firstName,
      lastName,
      email,
      phoneNumber,
      address,
      address2,
      country,
      state,
      city,
      postalCode,
      paymentMethod
    } = req.body;

    // Validate input
    if (!userId || !firstName || !lastName || !email || !phoneNumber || !address || !country || !state || !city || !postalCode || !paymentMethod) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.cartData || Object.keys(user.cartData).length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    const cartItems = Object.entries(user.cartData).map(([productId, item]) => ({
      productId,
      quantity: item.quantity || 1,
      amount: item.amount
    }));

    const totalAmount = cartItems.reduce((sum, item) => sum + item.amount * item.quantity, 0);

    const orderNumber = `ORD-${orderSequence++}`;

    const order = await Order.create({
      user: userId,
      orderNumber,
      items: cartItems,
      totalAmount,
      shippingDetails: {
        firstName,
        lastName,
        email,
        phoneNumber,
        address1: address,
        address2,
        country,
        state,
        city,
        postalCode
      },
      paymentMethod
    });

    // Clear user's cart
    user.cartData = {};
    await user.save();

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order
    });

  } catch (error) {
    console.error("Error in checkout:", error);
    next(error);
  }
};

//SECTION - GET ALL ORDERS
 const getAllOrders = async (req,res,next) => {
    try {
        const orders = await Order.find({}).populate("user", "fullName email");
        res.status(200).json(orders);
    } catch (error) {
        console.log("Error in get all orders ", error)
    }
}

//!SECTION USER GET OUR ORDERS
const userGetOrders = async (req,res,next) => {
    try {
        const orders = await Order.find({user: req.params.userId}).sort({createAt:  -1});
        res.status(200).json(orders)
    } catch (error) {
        console.log("Error in user get orders");
        next();
    }
}
 const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { status,orderCode } = req.body; // e.g. Paid, Shipped, Delivered

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });
    const isMatch = order.orderNumber === orderCode;
    if(!isMatch){
      return next(errorHandler(400,"Order code is invalid"));
    }
    order.status = status || order.status;
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order status updated",
      order
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    next(error);
  }
};

export default {
  checkout,
  getAllOrders,
  userGetOrders,
  updateOrderStatus
}