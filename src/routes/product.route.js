import express from "express"
import { isAdmin, verifyUser } from "../middleware/verifyUser.middleware.js";
import upload from "../middleware/product.multer.js";
import ProductController from "../controller/ProductController.js";


const router = express.Router();


//CREATE PRODUCT
router.post("/create-product",verifyUser,isAdmin,upload.fields([
    {name: "image1", maxCount: 1},
    {name: "image2", maxCount: 1},
    {name: "image3", maxCount: 1},
    {name: "image4", maxCount: 1},
    {name: "image5", maxCount: 1},
]),ProductController.createProduct)

//GET ALL PRODUCTS
router.get("/get-all-products", ProductController.getAllProducts)
//GET PRODUCT BY QUERY
router.get("/get", ProductController.getProduct)
//UPDATE PRODUCT
router.put("/update-product/:productId",verifyUser,isAdmin,upload.fields([
    {name: "image1", maxCount: 1},
    {name: "image2", maxCount: 1},
    {name: "image3", maxCount: 1},
    {name: "image4", maxCount: 1},
    {name: "image5", maxCount: 1},
]), ProductController.updateProduct);
//DELETE PORDUCT
router.delete("/delete-product/:productId",verifyUser,isAdmin,ProductController.deleteProduct)

router.post("/toggle-wishlist/:productId/:userId",verifyUser,ProductController.toggleWishList)

router.get("/get-wishlists/:userId",verifyUser,ProductController.getWishlistsProducts)


export default router;