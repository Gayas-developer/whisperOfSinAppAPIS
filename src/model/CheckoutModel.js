import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  orderNumber: { type: String, unique: true },

  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
      quantity: Number,
      amount: Number,
    }
  ],

  shippingDetails: {
    firstName: String,
    lastName: String,
    email: String,
    phoneNumber: String,
    address1: String,
    address2: String,
    country: String,
    state: String,
    city: String,
    postalCode: String,
  },

  paymentMethod: {
    type: String,
    enum: ["COD", "CreditCard", "Stripe", "Paypal"], // you can adjust
    default: "COD"
  },

  totalAmount: Number,
  status: {
    type: String,
    enum: ["Pending", "Paid", "Failed", "Shipped"],
    default: "Pending"
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
export default Order;
