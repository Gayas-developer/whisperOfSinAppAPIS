import express from "express";
import morgan from "morgan";
import colors from "colors";
import dotenv from "dotenv";
import connectDb from "./config/connectDb.js";
import authRoute from "./routes/auth.route.js";
import userRoute from "./routes/user.route.js";
import productRoute from "./routes/product.route.js";
import bidRoute from "./routes/bid.route.js";
import cartRoute from "./routes/cart.route.js";
import cookieParser from "cookie-parser";
import connectCloudinary from "./config/cloudinary.js";
import { server } from "./lib/socket.io.js";
import cors from "cors";

//SECTION -  =============================== CONFIG ===================================
dotenv.config();
//SECTION -  =============================== Initializing ===================================
const app = express();
//SECTION -  =============================== MIDDLE WARE ===================================
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
// Use cors middleware - place it before your routes
app.use(cors({
  origin: '*', // Allow all origins for development (NOT for production)
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
  allowedHeaders: ['Content-Type', 'access_token'], // Allow your custom header
}));app.use(express.urlencoded({ extended: true }));
//SECTION -  =============================== Routes ===================================
app.use("/api/auth", authRoute);
app.use("/api/user", userRoute);
app.use("/api/product", productRoute);
app.use("/api/bid", bidRoute);
app.use("/api/cart", cartRoute);

//SECTION -  =============================== TEST SERVER ===================================
app.get("/", (req, res) => {
  console.log(process.env.MONGO_URI);
  res.send("Health ok♥");
});

//SECTION -  =============================== Error Handler Middleware ===================================
app.use((error, req, res, next) => {
  const statusCode = error.statusCode || 500;
  const message = error.message || "Something went wrong";
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
  });
});

//SECTION -  =============================== Port ===================================

server.listen(3000,'0.0.0.0', () => console.log("🚀 Server running at http://localhost:3000"));


app.listen(5000,'0.0.0.0', () => {
  connectDb();
  connectCloudinary();
  console.log("Server is running successfully".bgYellow.white);
});
