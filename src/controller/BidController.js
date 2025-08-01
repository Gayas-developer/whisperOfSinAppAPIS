import Bid from "../model/bid.model.js";
import Product from "../model/product.model.js"
import { errorHandler } from "../utils/errorHandler.js";


// const placebid = async (req, res, next) => {
//     const { productId, userId, amount } = req.body;
//     try {
//         const product = await Product.findById(productId);
//         if (!product) {
//             return next(errorHandler(403, "Product not found"));
//         }

//         if (amount < 60) {
//             return next(errorHandler(400, "Minimum bid is $60"));
//         }

//         const newBid = await Bid.create({ product: productId, bidder: userId, amount: amount });

//         res.status(201).json(newBid);
//     } catch (error) {
//         console.log("Error in create bid ", error);
//         next();
//     }
// }



const placebid = async (req, res, next) => {
  const { productId, userId, amount } = req.body;

  try {
    const product = await Product.findById(productId);
    if (!product) return next(errorHandler(404, "Product not found"));

    if (amount < 60) return next(errorHandler(400, "Minimum bid is $60"));

    // 🕒 Check if bidding is allowed
    const now = new Date();

    if (product.bidtimer && now > product.bidtimer) {
      product.productUnable = true;
      await product.save();
      return next(errorHandler(403, "Bidding time is over. This product is now unavailable."));
    }

    // ⏱️ Start timer on first bid (if not already running)
    if (!product.bidtimer) {
      product.bidtimer = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
      await product.save();
    }

    // 🔁 Check if user already placed a bid
    let existingBid = await Bid.findOne({ product: productId, bidder: userId });

    if (existingBid) {
      // Update existing bid
      existingBid.amount = amount;
      existingBid.createdAt = now;
      await existingBid.save();

      return res.status(200).json({
        success: true,
        message: "Your bid has been updated.",
        bid: existingBid,
        bidEndTime: product.bidtimer,
      });
    } else {
      // Place new bid
      const newBid = await Bid.create({
        product: productId,
        bidder: userId,
        amount,
        createdAt: now,
      });

      return res.status(201).json({
        success: true,
        message: "Bid placed successfully.",
        bid: newBid,
        bidEndTime: product.bidtimer,
      });
    }
  } catch (error) {
    console.error("Error in placeBid:", error);
    next(errorHandler(500, "Internal Server Error"));
  }
};



const fetchBid = async (req, res, next) => {
    try {
        const bid = await Bid.find({ product: req.params.productId }).sort({amount: - 1}).limit(5).populate("bidder", "fullName",)

        res.json(bid);
    } catch (error) {
        console.log("Error in fetch bid ", error);
        next()
    }
}

export default {
    placebid,
    fetchBid
}