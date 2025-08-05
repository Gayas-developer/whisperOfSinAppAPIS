import { v2 as cloudinary } from "cloudinary";
import Product from "../model/product.model.js";
import { errorHandler } from "../utils/errorHandler.js";
import fs, { unlink } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import csv from "csv-parser";
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
      // location,
      price,
      hot,
      featured,
      newArrival,
      bidProduct, // 👈 input from client (true/false)
      bidtimer, // 👈 input from client if bidProduct is true
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
          folder: "Product Image",
        });
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
            resource_type: "video", // IMPORTANT: Safety resource_type as "video"
            folder: "Product videos", // A separate folder for videos
          });
          // After upload delete the local file
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
      video: videoUrl,
      description,
      reviews,
      // location,
      price,
      category,
      hot,
      featured,
      newArrival,
      bidProduct: bidProduct === "true" || bidProduct === true, // ensure boolean
      date: Date.now(),
    };

    // If it's a bid product, add timer
    if (productData.bidProduct) {
      if (!bidtimer) {
        return next(
          errorHandler(400, "Bid timer is required for bid products.")
        );
      }

      productData.bidtimer = new Date(bidtimer); // Should be ISO string from frontend
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
    //Ensure local files are dekted even if-cloudinary upload fails
    if (req.files) {
      const allFiles = [
        req.files.image1,
        req.files.image2,
        req.files.image3,
        req.files.image4,
        req.files.image5,
        req.files.video1,
        req.files.video2,
      ]
        .flat()
        .filter(Boolean); // Flatten and filter out nulls
      for (const file of allFiles) {
        if (file && file.path) {
          await unlinkAsync(file.path).catch((unlinkErr) =>
            console.error("Failed to delete local file", unlinkErr)
          );
        }
      }
    }
    console.log("Error in craete Product", error);
    next(errorHandler(500, "Failed to create product"));
  }
};

//SECTION = Create Product By CSV
// SECTION - Create Product By CSV
const createProductByCSV = async (req, res, next) => {
  if (!req.file) {
    return next(errorHandler(400, "Please upload a CSV file"));
  }

  const userId = req.userId;
  // Use `process.cwd()` to get the project root path for a reliable file path
  const filePath = path.join(process.cwd(), req.file.path);
  const results = [];

  try {
    const stream = fs.createReadStream(filePath);
    stream
      .pipe(csv())
      .on("data", (data) => {
        const bidProduct = data.bidProduct?.toLowerCase() === "true";

        const newProduct = {
          userId: userId,
          title: data.title,
          image: data.image
            ? data.image.split(",").map((url) => url.trim())
            : [],
          video: data.video
            ? data.video.split(",").map((url) => url.trim())
            : [],
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
            console.error(
              `Skipping product creation for "${data.title}" due to missing bidtimer.`
            );
            return;
          }
          newProduct.bidtimer = new Date(data.bidtimer);
        }

        if (newProduct.title && newProduct.price) {
          results.push(newProduct);
        } else {
          console.error(
            `Skipping product creation for "${data.title}" due to missing required fields.`
          );
        }
      })
      .on("end", async () => {
        try {
          if (results.length === 0) {
            await unlinkAsync(filePath);
            return res
              .status(400)
              .json({ message: "No valid products found in CSV file." });
          }

          const insertedProducts = await Product.insertMany(results);
          await unlinkAsync(filePath);

          res.status(201).json({
            message: `${insertedProducts.length} product(s) inserted successfully.`,
            products: insertedProducts.map((p) => ({
              _id: p._id,
              title: p.title,
            })),
          });
        } catch (dbError) {
          await unlinkAsync(filePath);
          console.error("Error inserting products:", dbError);
          next(
            errorHandler(500, "Error inserting products into the database.")
          );
        }
      })
      .on("error", async (err) => {
        await unlinkAsync(filePath);
        console.error("Error parsing the CSV file:", err);
        next(errorHandler(500, "Error parsing the CSV file."));
      });
  } catch (error) {
    await unlinkAsync(filePath).catch(() => {}); // Catch unlink error to avoid cascading issues
    console.error("Error in createProductByCSV:", error);
    next(errorHandler(500, "Failed to create products from CSV."));
  }
};

//SECTION -  GET PRODUCTS
const getProduct = async (req, res, next) => {
  try {
    const startIndex = parseInt(req.query.startIndex) || 0;
    const limit = parseInt(req.query.limit) || 9;
    const sortDirection = req.query.order === "asc" ? 1 : -1;

    const products = await Product.find({
      ...(req.query.userId && { userId: req.query.userId }),
      ...(req.query.productId && { _id: req.query.productId }),
    })
      .sort({ updatedAt: sortDirection })
      .skip(startIndex)
      // .limit(limit);

    const totalProduct = await Product.countDocuments();

    //Current Time
    const now = new Date();

    //Date for month ag0
    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );

    //FOR LAST MONTH AGO
    const lastMonthAgo = await Product.countDocuments({
      createdAt: { $gte: oneMonthAgo },
    });

    res.status(200).json({
      products,
      totalProduct,
      lastMonthAgo,
    });

    res.status(200).json(products);
  } catch (error) {
    console.log("Error in get products ", error);
    next();
  }
};

//SECTION -  GET SINGLE PRODUCTs
const getAllProducts = async (req, res, next) => {
  try {
    const products = await Product.find({});

    res.status(200).json({
      message: "Fetched Product successfully",
      products,
    });
  } catch (error) {
    console.log("Error in getProduct ", error);
    next();
  }
};

const updateProduct = async (req, res, next) => {
  // Array to keep track of local file paths for cleanup
  const filesToUnlink = [];

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
      bidtimer,
      // These come as JSON strings from the frontend
      existingImageUrls,
      existingVideoUrls,
    } = req.body;

    const productId = req.params.productId;
    const existingProduct = await Product.findById(productId);

    if (!existingProduct) {
      return next(errorHandler(404, "Product not found"));
    }

    // Parse existing URLs sent from frontend
    let finalImageUrls = existingImageUrls ? JSON.parse(existingImageUrls) : [];
    let finalVideoUrls = existingVideoUrls ? JSON.parse(existingVideoUrls) : [];

    // --- Handle Image Uploads ---
    const uploadedImages = [
      req.files?.image1?.[0],
      req.files?.image2?.[0],
      req.files?.image3?.[0],
      req.files?.image4?.[0],
      req.files?.image5?.[0],
    ].filter(Boolean); // Filter out null/undefined entries

    for (const file of uploadedImages) {
      filesToUnlink.push(file.path); // Add to cleanup list
      const result = await cloudinary.uploader.upload(file.path, {
        resource_type: "image",
        folder: "product_images", // Consistent folder name
      });
      finalImageUrls.push(result.secure_url);
    }

    // --- Handle Video Uploads ---
    const uploadedVideos = [
      req.files?.video1?.[0],
      req.files?.video2?.[0],
    ].filter(Boolean); // Filter out null/undefined entries

    for (const file of uploadedVideos) {
      filesToUnlink.push(file.path); // Add to cleanup list
      const result = await cloudinary.uploader.upload(file.path, {
        resource_type: "video", // IMPORTANT: Specify resource_type as "video"
        folder: "product_videos", // Separate folder for videos
      });
      finalVideoUrls.push(result.secure_url);
    }

    // Prepare update fields
    const updateData = {
      title: title || existingProduct.title,
      description: description || existingProduct.description,
      reviews: reviews || existingProduct.reviews,
      category: category || existingProduct.category,
      location: location || existingProduct.location,
      price: price || existingProduct.price,
      hot:
        hot === "true" ? true : hot === "false" ? false : existingProduct.hot, // Handle boolean string conversion
      featured:
        featured === "true"
          ? true
          : featured === "false"
          ? false
          : existingProduct.featured,
      newArrival:
        newArrival === "true"
          ? true
          : newArrival === "false"
          ? false
          : existingProduct.newArrival,
      image: finalImageUrls, // Update with new and retained image URLs
      video: finalVideoUrls, // Update with new and retained video URLs
      date: Date.now(), // Update modification date
    };

    // Handle bidProduct and bidtimer logic
    if (bidProduct === "true" || bidProduct === true) {
      if (!bidtimer) {
        return next(
          errorHandler(400, "Please provide a bid timer for bid products.")
        );
      }
      updateData.bidProduct = true;
      updateData.bidtimer = new Date(bidtimer);
      updateData.productUnable = false; // Reset to false when bidding is active
    } else if (bidProduct === "false" || bidProduct === false) {
      // If bidProduct is explicitly set to false, clear bidding-related fields
      updateData.bidProduct = false;
      updateData.bidtimer = null;
      updateData.productUnable = false; // Product is not bid-enabled, so not 'unable' due to bid timer
    } else {
      // If bidProduct is not provided in the request, retain existing value
      updateData.bidProduct = existingProduct.bidProduct;
      updateData.bidtimer = existingProduct.bidtimer;
      updateData.productUnable = existingProduct.productUnable;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      { new: true, runValidators: true } // Return the updated document and run schema validators
    );

    // Delete local temporary files after successful processing
    for (const filePath of filesToUnlink) {
      await unlinkAsync(filePath).catch((err) =>
        console.error(`Failed to delete local file ${filePath}:`, err)
      );
    }

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      updatedProduct,
    });
  } catch (error) {
    // Ensure local files are deleted even if an error occurs during processing
    for (const filePath of filesToUnlink) {
      await unlinkAsync(filePath).catch((err) =>
        console.error(
          `Failed to delete local file ${filePath} during error handling:`,
          err
        )
      );
    }
    console.error("Error in update product:", error);
    next(errorHandler(500, "Product update failed"));
  }
};

const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.productId);
    res.json({
      success: true,
      messgae: "Product deleted",
    });
  } catch (error) {
    console.log("Error in product delete", error);
    next();
  }
};

//SECTION - WISHLIST
const toggleWishList = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const userId = req.params.userId;

    const product = await Product.findById(productId);
    if (!product) {
      return next(errorHandler(403, "Product not found"));
    }

    const alreadyInWishList = await product.wishList.includes(userId);
    const total = await Product.countDocuments({ wishList: userId });
    if (alreadyInWishList) {
      //REMOVE FROM WISHLIST
      product.wishList.pull(userId);
    } else {
      //ADD IN WISHLIST
      product.wishList.push(userId);
    }

    await product.save();

    res.status(200).json({
      message: alreadyInWishList ? "Removed from wishlist" : "Add in wishlist",
      product,
      total,
    });
  } catch (error) {
    console.log("Error in wishlist ", error);
    next();
  }
};

const getWishlistsProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ wishList: req.params.userId });

    res.status(200).json({
      success: true,
      message: "Wishlist product fetch",
      products,
    });
  } catch (error) {
    console.log("Error in get wishlist products ", error);
    next();
  }
};

export default {
  createProduct,
  getProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
  toggleWishList,
  getWishlistsProducts,
  createProductByCSV,
};
