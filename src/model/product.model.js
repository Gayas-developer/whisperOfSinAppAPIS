import mongoose from "mongoose";


const productSchema  = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    title: {
        type: String,
        requird: true,
    },
    image: {
        type: Array,
        required: true
    },
    video: {
        type: Array, 
        required: false,
        default: [],
    },
    description: {
        type: String,
        requird:  true,
    },
    reviews: {
        type: String,
        required: true,
    } ,
    category: {
        type: String,
        required: true,
        enum: ["men","women"],
    },
    wishList:[ {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    bidProduct:{
        type: Boolean,
        default: false,
    },
    bidtimer: {
        type: Date,
        default: null
    },
    productUnable:{
        type: Boolean,
        default: false
    },
    // location: {
    //     type: String,
    //     required: true,
    // },
    bid:{
        type: mongoose.Schema.Types.ObjectId,
    },
    price: {
        type: Number,
        required: true,
    },
    hot : {
        type: Boolean,
        default: false,
    },
    featured: {
        type: Boolean,
        default: false,

    },
    newArrival: {
      type: Boolean,
      default: true,  
    },
    date: {}
},{timestamps: true});


const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
export default Product;
