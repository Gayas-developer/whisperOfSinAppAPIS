import sharp from "sharp";
import User from "../model/user.model.js";
import { errorHandler } from "../utils/errorHandler.js";
import {v2 as cloudinary} from "cloudinary";
import bcryptjs from "bcryptjs";

//SECTION -  GET USER
const getUser = async (req,res,next) => {
    try {

        const user = await User.findById(req.params.userId).select("-password");

        if(!user){
            return next(errorHandler(403, "User not found"));
        }

        res.status(200).json({
            success: true,
            message: "User get successfully",
            user,
        });
        
    } catch (error) {
        console.log(error);
        next();
    }
}


//SECTION -  UPDATE USER

const updateUser = async (req, res, next) => {
  try {
    const { pid } = req.params;
    const { fullName, password, phone, address } = req.body;
    let imageUrl;

    const existUser = await User.findById(pid);
    if (!existUser) {
      return next(errorHandler(404, "User not found"));
    }

    let hashedPassword;
    if (password) {
      hashedPassword = bcryptjs.hashSync(password, 10);
    }

    if (req.file) {
      const buffer = await sharp(req.file.buffer)
        .resize(300, 300, { fit: "cover" })
        .toFormat("jpeg")
        .toBuffer();

      const baseString = `data:image/jpeg;base64,${buffer.toString("base64")}`;

      try {
        const result = await cloudinary.uploader.upload(baseString, {
          resource_type: "image",
          folder: "Profile Photos",
        });
        imageUrl = result.secure_url;
      } catch (error) {
        return next(errorHandler(500, "Image upload failed"));
      }
    }

    // Update only the fields provided
    const updateFields = {};
    if (fullName) updateFields.fullName = fullName;
    if (password) updateFields.password = hashedPassword;
    if (phone) updateFields.phone = phone;
    if (address) updateFields.address = address;
    if (imageUrl) updateFields.profilePhoto = imageUrl;

    const updatedUser = await User.findByIdAndUpdate(pid, updateFields, {
      new: true,
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      updatedUser,
    });
  } catch (error) {
    console.error("Error in update profile", error);
    next(errorHandler(500, "Internal server error"));
  }
};



export default {
    getUser,
    updateUser
}