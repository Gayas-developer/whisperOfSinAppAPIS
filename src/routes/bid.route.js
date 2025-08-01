import express from "express"
import {verifyUser} from "../middleware/verifyUser.middleware.js"
import BidController from "../controller/BidController.js";

const router  = express.Router();

router.post("/place-bid",verifyUser,BidController.placebid)
router.get("/top-bid/:productId", BidController.fetchBid);

export default router;