// router.js (or wherever your product routes are defined)
// ... (other imports like verifyUser, isAdmin, upload)
import ProductController from "../controllers/ProductController.js"; // Ensure this path is correct

// Assuming 'upload' is your multer middleware configured for file uploads
// Example if you're using multer:
// import multer from 'multer';
// const upload = multer({ dest: 'uploads/' }); // Adjust destination as needed

router.post("/create-product", verifyUser, isAdmin, upload.fields([
    { name: "image1", maxCount: 1 },
    { name: "image2", maxCount: 1 },
    { name: "image3", maxCount: 1 },
    { name: "image4", maxCount: 1 },
    { name: "image5", maxCount: 1 },
    { name: "video1", maxCount: 1 }, // Added video1 field
    { name: "video2", maxCount: 1 }, // Added video2 field
]), ProductController.createProduct);

// ... (other routes like create-product-by-csv)
// ProductController.js
import { v2 as cloudinary } from "cloudinary";
import Product from "../model/product.model.js";
import { errorHandler } from "../utils/errorHandler.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import csv from 'csv-parser';
import { promisify } from "util";

// Promisify the fs.unlink function for better async handling
const unlinkAsync = promisify(fs.unlink);

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const createProduct = async (req, res, next) => {
    try {
        const {
            title,
            description,
            reviews,
            category,
            location,
            price,
            hot,
            featured,
            newArrival,
            bidProduct,
            bidtimer
        } = req.body;

        // Handle multiple image uploads
        const imagea = req.files.image1 && req.files.image1[0];
        const imageb = req.files.image2 && req.files.image2[0];
        const imagec = req.files.image3 && req.files.image3[0];
        const imaged = req.files.image4 && req.files.image4[0];
        const imagee = req.files.image5 && req.files.image5[0];

        const images = [imagea, imageb, imagec, imaged, imagee].filter(Boolean);

        let imageUrl = await Promise.all(
            images.map(async (item) => {
                const result = await cloudinary.uploader.upload(item.path, {
                    resource_type: "image",
                    folder: "Product Image"
                });
                // After upload, delete the local file
                await unlinkAsync(item.path);
                return result.secure_url;
            })
        );

        // Handle video uploads (up to 2 videos)
        const video1 = req.files.video1 && req.files.video1[0];
        const video2 = req.files.video2 && req.files.video2[0];

        const videos = [video1, video2].filter(Boolean);

        let videoUrl = [];
        if (videos.length > 0) {
            videoUrl = await Promise.all(
                videos.map(async (item) => {
                    const result = await cloudinary.uploader.upload(item.path, {
                        resource_type: "video", // IMPORTANT: Specify resource_type as "video"
                        folder: "Product Videos" // A separate folder for videos
                    });
                    // After upload, delete the local file
                    await unlinkAsync(item.path);
                    return result.secure_url;
                })
            );
        }

        // Construct product data
        const productData = {
            userId: req.userId,
            title,
            image: imageUrl,
            video: videoUrl, // Added video URLs to product data
            description,
            reviews,
            location,
            price,
            category,
            hot,
            featured,
            newArrival,
            bidProduct: bidProduct === "true" || bidProduct === true,
            date: Date.now(),
        };

        // If it's a bid product, add timer
        if (productData.bidProduct) {
            if (!bidtimer) {
                return next(errorHandler(400, "Bid timer is required for bid products."));
            }
            productData.bidtimer = new Date(bidtimer);
            productData.productUnable = false;
        }

        const product = new Product(productData);
        await product.save();

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            product,
        });
    } catch (error) {
        // Ensure local files are deleted even if cloudinary upload fails
        if (req.files) {
            const allFiles = [
                req.files.image1, req.files.image2, req.files.image3, req.files.image4, req.files.image5,
                req.files.video1, req.files.video2
            ].flat().filter(Boolean); // Flatten and filter out nulls
            for (const file of allFiles) {
                if (file && file.path) {
                    await unlinkAsync(file.path).catch(unlinkErr => console.error("Failed to delete local file:", unlinkErr));
                }
            }
        }
        console.log("Error in Create Product", error);
        next(errorHandler(500, "Failed to create product"));
    }
};

// SECTION - Create Product By CSV (No changes needed here for video, as it relies on CSV data)
const createProductByCSV = async (req, res, next) => {
    if (!req.file) {
        return next(errorHandler(400, "Please upload a CSV file"));
    }

    const userId = req.userId;
    const filePath = path.join(process.cwd(), req.file.path);
    const results = [];

    try {
        const stream = fs.createReadStream(filePath);
        stream
            .pipe(csv())
            .on('data', (data) => {
                const bidProduct = data.bidProduct?.toLowerCase() === "true";

                const newProduct = {
                    userId: userId,
                    title: data.title,
                    image: data.image ? data.image.split(',').map(url => url.trim()) : [],
                    video: data.video ? data.video.split(',').map(url => url.trim()) : [], // Added video parsing from CSV
                    category: data.category,
                    description: data.description,
                    reviews: data.reviews,
                    location: data.location,
                    price: parseFloat(data.price),
                    hot: data.hot?.toLowerCase() === "true",
                    featured: data.featured?.toLowerCase() === "true",
                    newArrival: data.newArrival?.toLowerCase() === "true",
                    bidProduct: bidProduct,
                    date: new Date(),
                };

                if (bidProduct) {
                    if (!data.bidtimer) {
                        console.error(`Skipping product creation for "${data.title}" due to missing bidtimer.`);
                        return;
                    }
                    newProduct.bidtimer = new Date(data.bidtimer);
                }

                if (newProduct.title && newProduct.price) {
                    results.push(newProduct);
                } else {
                    console.error(`Skipping product creation for "${data.title}" due to missing required fields.`);
                }
            })
            .on('end', async () => {
                try {
                    if (results.length === 0) {
                        await unlinkAsync(filePath);
                        return res.status(400).json({ message: "No valid products found in CSV file." });
                    }

                    const insertedProducts = await Product.insertMany(results);
                    await unlinkAsync(filePath);

                    res.status(201).json({
                        message: `${insertedProducts.length} product(s) inserted successfully.`,
                        products: insertedProducts.map(p => ({ _id: p._id, title: p.title }))
                    });
                } catch (dbError) {
                    await unlinkAsync(filePath);
                    console.error("Error inserting products:", dbError);
                    next(errorHandler(500, "Error inserting products into the database."));
                }
            })
            .on('error', async (err) => {
                await unlinkAsync(filePath);
                console.error("Error parsing the CSV file:", err);
                next(errorHandler(500, "Error parsing the CSV file."));
            });
    } catch (error) {
        await unlinkAsync(filePath).catch(() => {});
        console.error("Error in createProductByCSV:", error);
        next(errorHandler(500, "Failed to create products from CSV."));
    }
};

export default {
    createProduct,
    createProductByCSV
};
