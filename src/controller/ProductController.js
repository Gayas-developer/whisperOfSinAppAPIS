  import { v2 as cloudinary } from "cloudinary";
  import Product from "../model/product.model.js";
  import { errorHandler } from "../utils/errorHandler.js";



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
      bidProduct,      // 👈 input from client (true/false)
      bidtimer         // 👈 input from client if bidProduct is true
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
        return result.secure_url;
      })
    );

    // Construct product data
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
      bidProduct: bidProduct === "true" || bidProduct === true, // ensure boolean
      date: Date.now(),
    };

    // If it's a bid product, add timer
    if (productData.bidProduct) {
      if (!bidtimer) {
        return next(errorHandler(400, "Bid timer is required for bid products."));
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
    console.log("Error in Create Product", error);
    next(errorHandler(500, "Failed to create product"));
  }
};




  //SECTION -  GET PRODUCTS
  const getProduct = async (req, res, next) => {
    try {
      const startIndex = parseInt(req.query.startIndex) || 0;
      const limit = parseInt(req.query.limit) || 9;
      const sortDirection =  req.query.order === "asc" ? 1 : -1;

      const products = await Product.find({
          ...(req.query.userId && {userId: req.query.userId}),
          ...(req.query.productId && {_id: req.query.productId}),
      }).sort({updatedAt: sortDirection}).skip(startIndex).limit(limit);

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
          createdAt: {$gte: oneMonthAgo},
      })

      res.status(200).json({
          products,
          totalProduct,
          lastMonthAgo
      })


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
        products
      });
    } catch (error) {
      console.log("Error in getProduct ", error);
      next();
    }
  };



  
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
      bidProduct,     // 👈 updated or added from frontend
      bidtimer        // 👈 updated or added if bidProduct is true
    } = req.body;

    const existingProduct = await Product.findById(req.params.productId);
    if (!existingProduct) {
      return next(errorHandler(403, "Product not found"));
    }

    // Upload updated images
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

    // Prepare update fields
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

    // If bidding enabled
    if (bidProduct === "true" || bidProduct === true) {
      if (!bidtimer) {
        return next(errorHandler(400, "Please provide a bid timer"));
      }
      updateData.bidProduct = true;
      updateData.bidtimer = new Date(bidtimer);
      updateData.productUnable = false;
    } else if (bidProduct === "false" || bidProduct === false) {
      // Clear bidding-related fields
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
  const toggleWishList = async (req,res,next) => {
    try {
      const { productId } = req.params;
      const userId = req.params.userId;

      const product = await Product.findById(productId);
      if(!product){
        return next(errorHandler(403, "Product not found"))
      }

      const alreadyInWishList = await product.wishList.includes(userId);
      const total = await Product.countDocuments({wishList: userId});
      if(alreadyInWishList){
        //REMOVE FROM WISHLIST
        product.wishList.pull(userId);
      }else{
        //ADD IN WISHLIST
        product.wishList.push(userId);
      }

      await product.save();

      res.status(200).json({
        message: alreadyInWishList ? "Removed from wishlist" : "Add in wishlist",
        product,
        total
      })
    } catch (error) {
      console.log("Error in wishlist ",error);
      next();
    }
  }


  const getWishlistsProducts =  async (req,res,next) => {
    try {
      const products = await Product.find({ wishList: req.params.userId});

      res.status(200).json({
          success: true,
          message: "Wishlist product fetch",
          products
      })
    } catch (error) {
      console.log("Error in get wishlist products " ,error);
      next();
    }
  }


  
  export default {
    createProduct,
    getProduct,
    getAllProducts,
     updateProduct,
    deleteProduct,
    toggleWishList,
    getWishlistsProducts
  };
