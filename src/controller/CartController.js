import User from "../model/user.model.js"
import Product from "../model/product.model.js";
import { errorHandler } from "../utils/errorHandler.js";
import Bid from "../model/bid.model.js";

//SECTION - bid highest ha to 1 time buy

// const addToCartWithBid = async (req, res, next) => {
//   try {
//     const { userId, productId } = req.body;

//     if (!userId || !productId) {
//       return next(errorHandler(400, "Missing required fields"));
//     }

//     const user = await User.findById(userId);
//     if (!user) return next(errorHandler(404, "User not found"));

//     const product = await Product.findById(productId);
//     if (!product) return next(errorHandler(404, "Product not found"));

//     // Get top bid for the product
//     const topBid = await Bid.findOne({ product: productId })
//       .sort({ amount: -1 });

//     if (!topBid || String(topBid.bidder) !== userId) {
//       return next(errorHandler(403, "Only the highest bidder can add this product to cart"));
//     }

//     // Prevent duplicate cart entries
//     if (user.cartData?.[productId]) {
//       return next(errorHandler(400, "This product is already in your cart"));
//     }

//     // Add product with bid amount to cart
//     user.cartData = {
//       ...user.cartData,
//       [productId]: { amount: topBid.amount }
//     };

//     await user.save();

//     res.status(200).json({
//       success: true,
//       message: "Product added to cart",
//       cart: user.cartData,
//     });

//   } catch (error) {
//     console.error("Error in addToCartWithBid:", error);
//     next(errorHandler(500, "Internal Server Error"));
//   }
// };



//SECTION - QUANTITY UPDATE WITH QUANTITY INPUT 
// const addToCartWithBid = async (req, res, next) => {
//   try {
//     const { userId, productId, quantity } = req.body;

//     if (!userId || !productId || !quantity) {
//       return next(errorHandler(400, "Missing required fields"));
//     }

//     const user = await User.findById(userId);
//     if (!user) return next(errorHandler(404, "User not found"));

//     const product = await Product.findById(productId);
//     if (!product) return next(errorHandler(404, "Product not found"));



//     if (!user.cartData) user.cartData = {};

//     // Set manual quantity (overwrite or add)
//     user.cartData[productId] = {
//       amount: update.amount,
//       quantity: parseInt(quantity)
//     };

//     user.markModified("cartData"); // Force mongoose to track nested object
//     await user.save();

//     res.status(200).json({
//       success: true,
//       message: "Quantity updated in cart",
//       cart: user.cartData,
//     });

//   } catch (error) {
//     console.error("Error in addToCartWithBid:", error);
//     next(errorHandler(500, "Internal Server Error"));
//   }
// };


//SECTION - ADD ONLICK INCREMENT WITH TOP BID
// const addToCartWithBid = async (req, res, next) => {
//   try {
//     const { userId, productId } = req.body;

//     if (!userId || !productId) {
//       return next(errorHandler(400, "Missing required fields"));
//     }

//     const user = await User.findById(userId);
//     if (!user) return next(errorHandler(404, "User not found"));

//     const product = await Product.findById(productId);
//     if (!product) return next(errorHandler(404, "Product not found"));

//     const topBid = await Bid.findOne({ product: productId }).sort({ amount: -1 });

//     if (!topBid || String(topBid.bidder) !== userId) {
//       return next(errorHandler(403, "Only the highest bidder can add this product to cart"));
//     }

//     if (!user.cartData) user.cartData = {};

//     if (user.cartData[productId]) {
//       user.cartData[productId].quantity = (user.cartData[productId].quantity || 1) + 1;
//     } else {
//       user.cartData[productId] = {
//         amount: topBid.amount,
//         quantity: 1
//       };
//     }

//     // ✅ Force Mongoose to track cartData changes
//     user.markModified("cartData");

//     await user.save();

//     res.status(200).json({
//       success: true,
//       message: "Product added to cart",
//       cart: user.cartData,
//     });

//   } catch (error) {
//     console.error("Error in addToCartWithBid:", error);
//     next(errorHandler(500, "Internal Server Error"));
//   }
// };

//!SECTION - DECREMENT ONLICK  WITH TOP BID
// const addToCartWithBid = async (req, res, next) => {
//   try {
//     const { userId, productId } = req.body;

//     if (!userId || !productId) {
//       return next(errorHandler(400, "Missing required fields"));
//     }

//     const user = await User.findById(userId);
//     if (!user) return next(errorHandler(404, "User not found"));

//     const product = await Product.findById(productId);
//     if (!product) return next(errorHandler(404, "Product not found"));

//     const topBid = await Bid.findOne({ product: productId }).sort({ amount: -1 });

//     if (!topBid || String(topBid.bidder) !== userId) {
//       return next(errorHandler(403, "Only the highest bidder can add this product to cart"));
//     }

//     if (!user.cartData) user.cartData = {};

//     if (user.cartData[productId]) {
//       user.cartData[productId].quantity = (user.cartData[productId].quantity || 1) - 1;
//     } else {
//       user.cartData[productId] = {
//         amount: topBid.amount,
//         quantity: 1
//       };
//     }

//     // ✅ Force Mongoose to track cartData changes
//     user.markModified("cartData");

//     await user.save();

//     res.status(200).json({
//       success: true,
//       message: "Product added to cart",
//       cart: user.cartData,
//     });

//   } catch (error) {
//     console.error("Error in addToCartWithBid:", error);
//     next(errorHandler(500, "Internal Server Error"));
//   }
// };


//SECTION - ADD ONLICK INCREMENT WITHOUT TOP BID
// const addToCartWithBid = async (req, res, next) => {
//   try {
//     const { userId, productId } = req.body;

//     if (!userId || !productId) {
//       return next(errorHandler(400, "Missing required fields"));
//     }

//     const user = await User.findById(userId);
//     if (!user) return next(errorHandler(404, "User not found"));

//     const product = await Product.findById(productId);
//     if (!product) return next(errorHandler(404, "Product not found"));


   

//     if (!user.cartData) user.cartData = {};

//     if (user.cartData[productId]) {
//       user.cartData[productId].quantity = (user.cartData[productId].quantity || 1) + 1;
//     } else {
//       user.cartData[productId] = {
//         amount: topBid.amount,
//         quantity: 1
//       };
//     }

//     // ✅ Force Mongoose to track cartData changes
//     user.markModified("cartData");

//     await user.save();

//     res.status(200).json({
//       success: true,
//       message: "Product added to cart",
//       cart: user.cartData,
//     });

//   } catch (error) {
//     console.error("Error in addToCartWithBid:", error);
//     next(errorHandler(500, "Internal Server Error"));
//   }
// };

const addToCart = async (req, res, next) => {
  try {
    const { userId, productId } = req.body;

    if (!userId || !productId) {
      return next(errorHandler(400, "Missing required fields"));
    }

    const user = await User.findById(userId);
    if (!user) return next(errorHandler(404, "User not found"));

    const product = await Product.findById(productId);
    if (!product) return next(errorHandler(404, "Product not found"));

    if (!user.cartData) user.cartData = {};

    if (user.cartData[productId]) {
      user.cartData[productId].quantity += 1;
    } else {
      user.cartData[productId] = {
        title: product.title,
        image: product.image[0],
        amount: product.price || 0, // fallback if needed
        quantity: 1,
      };
    }

    user.markModified("cartData");
    await user.save();

    res.status(200).json({
      success: true,
      message: "Product added to cart",
      cart: user.cartData,
    });
  } catch (error) {
    console.error("Error in addToCartWithBid:", error);
    next(errorHandler(500, "Internal Server Error"));
  }
};



//!SECTION - DECREMENT ONLICK  WITHout TOP BID
const decToCartWithBid = async (req, res, next) => {
  try {
    const { userId, productId } = req.body;

    if (!userId || !productId) {
      return next(errorHandler(400, "Missing required fields"));
    }

    const user = await User.findById(userId);
    if (!user) return next(errorHandler(404, "User not found"));

    const product = await Product.findById(productId);
    if (!product) return next(errorHandler(404, "Product not found"));


    if (!user.cartData) user.cartData = {};

    if (user.cartData[productId]) {
      user.cartData[productId].quantity = (user.cartData[productId].quantity || 1) - 1;
    } else {
      user.cartData[productId] = {
        amount: product.amount,
        quantity: 1
      };
    }

    // ✅ Force Mongoose to track cartData changes
    user.markModified("cartData");

    await user.save();

    res.status(200).json({
      success: true,
      message: "Product added to cart",
      cart: user.cartData,
    });

  } catch (error) {
    console.error("Error in addToCartWithBid:", error);
    next(errorHandler(500, "Internal Server Error"));
  }
};

const removeFromCart = async (req, res, next) => {
  try {
    const { userId, productId } = req.body;

    if (!userId || !productId) {
      return next(errorHandler(400, "Missing required fields"));
    }

    const user = await User.findById(userId);
    if (!user) return next(errorHandler(404, "User not found"));

    // Check if product is in cart
    if (!user.cartData || !user.cartData[productId]) {
      return next(errorHandler(400, "Product not found in cart"));
    }

    // Delete from cart
    delete user.cartData[productId];

    // Let mongoose know that nested field has changed
    user.markModified("cartData");

    await user.save();

    res.status(200).json({
      success: true,
      message: "Product removed from cart",
      cart: user.cartData,
    });

  } catch (error) {
    console.error("Error in removeFromCart:", error);
    next(errorHandler(500, "Internal Server Error"));
  }
};



const getCart = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return next(errorHandler(400, "User ID is required"));
    }

    const user = await User.findById(userId);
    if (!user) return next(errorHandler(404, "User not found"));

    res.status(200).json({
      success: true,
      cart: user.cartData || {},
    });

  } catch (error) {
    console.error("Error in getCart:", error);
    next(errorHandler(500, "Internal Server Error"));
  }
};



export default {
    addToCart,
    removeFromCart,
    getCart,
    decToCartWithBid
}
