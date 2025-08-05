// socket.js (or wherever your Socket.IO server is initialized)
import http from "http";
import express from "express";
import { Server } from "socket.io";
import Bid from "../model/bid.model.js";
import Product from "../model/product.model.js"; // Adjust path to your Product model
import User from "../model/user.model.js"; // Adjust path to your User model

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { 
        origin: ["*"], // Allow all origins for development. For production, specify your React Native app's origin (e.g., "exp://192.168.1.100:19000")
        methods: ["GET", "POST"]
    },
});

io.on("connection", (socket) => {
    console.log("🟢 Socket Connected:", socket.id);

    // Event to join a specific product's bidding room
    socket.on("join-product", (productId) => {
        socket.join(productId);
        console.log(`Socket ${socket.id} joined room: ${productId}`);
    });

    // Event to place a bid
    socket.on("place-bid", async ({ productId, userId, amount }) => {
        console.log(`Received bid: ProductId=${productId}, UserId=${userId}, Amount=${amount}`);

        if (amount < 60) {
            // Emit an error back to the bidder
            socket.emit("bid-error", { message: "Minimum bid is $60" });
            return;
        }

        try {
            const product = await Product.findById(productId);
            if (!product) {
                socket.emit("bid-error", { message: "Product not found" });
                return;
            }

            // Check if bidding time is over
            const now = new Date();
            if (product.bidtimer && now > product.bidtimer) {
                product.productUnable = true;
                await product.save();
                socket.emit("bid-error", { message: "Bidding time is over. This product is now unavailable." });
                return;
            }

            // Start timer on first bid if not already running (30 minutes from now)
            if (!product.bidtimer) {
                product.bidtimer = new Date(now.getTime() + 30 * 60 * 1000);
                await product.save();
                // You might want to emit a "timer-started" event here
                io.to(productId).emit("bid-timer-started", { bidEndTime: product.bidtimer });
            }

            // Find or create the bid
            let bidRecord = await Bid.findOne({ product: productId, bidder: userId });

            if (bidRecord) {
                // Update existing bid if new amount is higher
                if (amount > bidRecord.amount) {
                    bidRecord.amount = amount;
                    bidRecord.createdAt = now;
                    await bidRecord.save();
                    console.log(`Bid updated for ${userId} on ${productId}: ${amount}`);
                } else {
                    socket.emit("bid-error", { message: "Your new bid must be higher than your current bid." });
                    return;
                }
            } else {
                // Place new bid
                bidRecord = await Bid.create({
                    product: productId,
                    bidder: userId,
                    amount,
                    createdAt: now,
                });
                console.log(`New bid placed by ${userId} on ${productId}: ${amount}`);
            }

            // Fetch top bids for this product, populate bidder's fullName
            const topBids = await Bid.find({ product: productId })
                .sort({ amount: -1 }) // Sort by amount descending
                .limit(5)
                .populate("bidder", "fullName"); // Populate only fullName from User model

            // Emit updated bids to all clients in the product room
            io.to(productId).emit("bid-updated", {
                topBids,
                currentHighestBid: topBids.length > 0 ? topBids[0].amount : 0,
                bidEndTime: product.bidtimer // Send the updated bid timer
            });

        } catch (error) {
            console.error("Error in place-bid socket event:", error);
            socket.emit("bid-error", { message: "Failed to place bid due to server error." });
        }
    });

    socket.on("disconnect", () => {
        console.log("🔴 Socket Disconnected:", socket.id);
    });
});

// HTTP controller functions (these are separate from socket events)
const placebid = async (req, res, next) => {
    // This function is for HTTP requests, not directly for socket events.
    // It's good to keep it for RESTful API calls if needed.
    // The socket "place-bid" event handles real-time updates.
    // ... (your existing placebid logic here)
    // You might want to trigger a socket event from here as well after saving to DB
    // io.to(productId).emit("bid-updated", topBids);
};

const fetchBid = async (req, res, next) => {
    try {
        const bids = await Bid.find({ product: req.params.productId })
            .sort({ amount: -1 })
            .limit(5)
            .populate("bidder", "fullName");

        res.json(bids);
    } catch (error) {
        console.error("Error in fetchBid (HTTP):", error);
        next(error); // Pass error to Express error handler
    }
};

export { io, app, server }; // Export for use in your main server file

// Export HTTP controllers if you still use them
export const bidControllers = {
    placebid,
    fetchBid
};



// //=====================   PACKAGES   ==============================
// import http from "http";
// import express from "express";
// import { Server } from "socket.io";
// import Bid from "../model/bid.model.js";

// const app = express();
// const server = http.createServer(app);

// const io = new Server(server, {
//     cors: { origin: ["http://localhost:8000"] },
// });

// io.on("connection", (socket) => {
//     console.log("🟢 connected", socket.id);

//     socket.on("join-product", (productId) => {
//         socket.join(productId);
//     });

//     socket.on("place-bid", async ({ productId, userId, amount }) => {
//         if (amount < 60) return;

//         try {
//             const bid = await Bid.create({
//                 product: productId,
//                 bidder: userId,
//                 amount: amount,
//             });

//             const topBids = await Bid.find({
//                 product: productId,
//                 bidder: userId,
//                 amount: amount,
//             })
//                 .sort(amount - 1)
//                 .limit(5)
//                 .poplate("product", "bidder");

//             io.to(productId).emit("bid-updated", topBids);
//         } catch (error) {
//             console.log("Error in socket ", error);
//         }
//     });

//     socket.on("disconnect", () => {
//         console.log("🔴 Disconnected:", socket.id);
//     });
// });

// export { io, app, server };
