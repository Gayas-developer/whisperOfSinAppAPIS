import express from "express"
import CartController from "../controller/CartController.js";
import { verifyUser } from "../middleware/verifyUser.middleware.js";

const router = express.Router();

router.post("/addToCart",verifyUser,CartController.addToCart)
router.post("/decToCartWithBid",verifyUser,CartController.decToCartWithBid)
router.post("/remove-from-cart",verifyUser,CartController.removeFromCart)
router.get("/get-cart/:userId",verifyUser, CartController.getCart);



export default router; 