import mongoose from "mongoose";

const bidSchema = new mongoose.Schema({
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true, },
    bidder: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    createdAt: {type: Date, default: Date.now}
}, { timestamps: true });

const Bid = mongoose.models.Bid || mongoose.model("Bid", bidSchema);

export default Bid;