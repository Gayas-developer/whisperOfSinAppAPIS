//=====================   PACKAGES   ==============================
import http from "http";
import express from "express";
import { Server } from "socket.io";
import Bid from "../model/bid.model.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: ["http://localhost:8000"] },
});

io.on("connection", (socket) => {
    console.log("🟢 connected", socket.id);

    socket.on("join-product", (productId) => {
        socket.join(productId);
    });

    socket.on("place-bid", async ({ productId, userId, amount }) => {
        if (amount < 60) return;

        try {
            const bid = await Bid.create({
                product: productId,
                bidder: userId,
                amount: amount,
            });

            const topBids = await Bid.find({
                product: productId,
                bidder: userId,
                amount: amount,
            })
                .sort(amount - 1)
                .limit(5)
                .poplate("product", "bidder");

            io.to(productId).emit("bid-updated", topBids);
        } catch (error) {
            console.log("Error in socket ", error);
        }
    });

    socket.on("disconnect", () => {
        console.log("🔴 Disconnected:", socket.id);
    });
});

export { io, app, server };
