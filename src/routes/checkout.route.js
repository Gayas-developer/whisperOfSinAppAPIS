import express from "express"
import CheckoutController from "../controller/CheckoutController.js";
import {isAdmin, verifyUser} from "../middleware/verifyUser.middleware.js"

const router = express.Router();



router.post("/checkout",verifyUser,CheckoutController.checkout);
router.get("/get-all-orders",verifyUser,isAdmin,CheckoutController.getAllOrders)
router.get("/user-get-your-orders/:userId",verifyUser,CheckoutController.userGetOrders)
router.put("/update-orders/:orderId",verifyUser,isAdmin,CheckoutController.updateOrderStatus)



export default router;