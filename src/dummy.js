import { v2 as cloudinary } from "cloudinary";
import Product from "../model/product.model.js";
import { errorHandler } from "../utils/errorHandler.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import csv from 'csv-parser';
import { promisify } from 'util';

// Promisify the fs.unlink function for better async handling
const unlinkAsync = promisify(fs.unlink);

// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// SECTION - Create Product
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
      bidtimer,
    } = req.body;

    const imagea = req.files?.image1?.[0];
    const imageb = req.files?.image2?.[0];
    const imagec = req.files?.image3?.[0];
    const imaged = req.files?.image4?.[0];
    const imagee = req.files?.image5?.[0];

    const images = [imagea, imageb, imagec, imaged, imagee].filter(Boolean);

    let imageUrl = await Promise.all(
      images.map(async (item) => {
        const result = await cloudinary.uploader.upload(item.path, {
          resource_type: "image",
          folder: "Product Image"
        });
        return result.secure_url;
      })
    );

    const productData = {
      userId: req.userId,
      title,
      image: imageUrl,
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
    console.error("Error in Create Product", error);
    next(errorHandler(500, "Failed to create product"));
  }
};


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
      .on('data', (data) => {
        const bidProduct = data.bidProduct?.toLowerCase() === "true";

        const newProduct = {
          userId: userId,
          title: data.title,
          image: data.image ? data.image.split(',').map(url => url.trim()) : [],
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
    await unlinkAsync(filePath).catch(() => {}); // Catch unlink error to avoid cascading issues
    console.error("Error in createProductByCSV:", error);
    next(errorHandler(500, "Failed to create products from CSV."));
  }
};


// SECTION - GET PRODUCTS
const getProduct = async (req, res, next) => {
  try {
    const startIndex = parseInt(req.query.startIndex) || 0;
    const limit = parseInt(req.query.limit) || 9;
    const sortDirection = req.query.order === "asc" ? 1 : -1;

    const products = await Product.find({
      ...(req.query.userId && { userId: req.query.userId }),
      ...(req.query.productId && { _id: req.query.productId }),
    }).sort({ updatedAt: sortDirection }).skip(startIndex).limit(limit);

    const totalProduct = await Product.countDocuments();

    const now = new Date();
    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate()
    );

    const lastMonthAgo = await Product.countDocuments({
      createdAt: { $gte: oneMonthAgo },
    });

    // --- Duplicate `res` call removed here ---
    res.status(200).json({
      products,
      totalProduct,
      lastMonthAgo
    });
  } catch (error) {
    console.error("Error in get products ", error);
    next(error); // Passing the error to the next middleware
  }
};

// SECTION - GET SINGLE PRODUCTS
const getAllProducts = async (req, res, next) => {
  try {
    const products = await Product.find({});

    res.status(200).json({
      message: "Fetched Product successfully",
      products
    });
  } catch (error) {
    console.error("Error in getProduct ", error);
    next(error);
  }
};

// SECTION - Update Product
const updateProduct = async (req, res, next) => {
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
    } = req.body;

    const existingProduct = await Product.findById(req.params.productId);
    if (!existingProduct) {
      return next(errorHandler(403, "Product not found"));
    }

    const uploadedImages = [
      req.files?.image1?.[0],
      req.files?.image2?.[0],
      req.files?.image3?.[0],
      req.files?.image4?.[0],
      req.files?.image5?.[0],
    ];

    let finalImageUrls = [...(existingProduct.image || [])];

    for (let i = 0; i < uploadedImages.length; i++) {
      const file = uploadedImages[i];
      if (file) {
        const result = await cloudinary.uploader.upload(file.path, {
          resource_type: "image",
          folder: "product_images",
        });

        if (finalImageUrls[i]) {
          finalImageUrls[i] = result.secure_url;
        } else {
          finalImageUrls.push(result.secure_url);
        }
      }
    }

    const updateData = {
      title: title || existingProduct.title,
      image: finalImageUrls,
      description: description || existingProduct.description,
      reviews: reviews || existingProduct.reviews,
      category: category || existingProduct.category,
      location: location || existingProduct.location,
      price: price || existingProduct.price,
      hot: hot ?? existingProduct.hot,
      featured: featured ?? existingProduct.featured,
      newArrival: newArrival ?? existingProduct.newArrival,
      date: Date.now(),
    };

    if (bidProduct === "true" || bidProduct === true) {
      if (!bidtimer) {
        return next(errorHandler(400, "Please provide a bid timer"));
      }
      updateData.bidProduct = true;
      updateData.bidtimer = new Date(bidtimer);
      updateData.productUnable = false;
    } else if (bidProduct === "false" || bidProduct === false) {
      updateData.bidProduct = false;
      updateData.bidtimer = null;
      updateData.productUnable = false;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.productId,
      updateData,
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      updatedProduct,
    });
  } catch (error) {
    console.error("Error in update product:", error);
    next(errorHandler(500, "Product update failed"));
  }
};

// SECTION - Delete Product
const deleteProduct = async (req, res, next) => {
  try {
    await Product.findByIdAndDelete(req.params.productId);
    res.json({
      success: true,
      message: "Product deleted",
    });
  } catch (error) {
    console.error("Error in product delete", error);
    next(error);
  }
};

// SECTION - Wishlist
const toggleWishList = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const userId = req.params.userId;

    const product = await Product.findById(productId);
    if (!product) {
      return next(errorHandler(403, "Product not found"));
    }

    const alreadyInWishList = product.wishList.includes(userId);
    const total = await Product.countDocuments({ wishList: userId });

    if (alreadyInWishList) {
      product.wishList.pull(userId);
    } else {
      product.wishList.push(userId);
    }

    await product.save();

    res.status(200).json({
      message: alreadyInWishList ? "Removed from wishlist" : "Add in wishlist",
      product,
      total
    });
  } catch (error) {
    console.error("Error in wishlist ", error);
    next(error);
  }
};

const getWishlistsProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ wishList: req.params.userId });

    res.status(200).json({
      success: true,
      message: "Wishlist product fetch",
      products
    });
  } catch (error) {
    console.error("Error in get wishlist products ", error);
    next(error);
  }
};

export {
  createProduct,
  getProduct,
  getAllProducts,
  updateProduct,
  deleteProduct,
  toggleWishList,
  getWishlistsProducts,
  createProductByCSV
};
