import jwt from "jsonwebtoken";
import { errorHandler } from "../utils/errorHandler.js";
import User from "../model/user.model.js";


//USER CHECK IS VERIFY???
export const verifyUser = async (req, res, next) => {
    try {
        const token = req.headers["access_token"];
        console.log("token ".bgRed, token)

        if (!token) {
            return next(errorHandler(400, "Unauthorized-No token provided"));
        }

        //DECODE THE TOKEN 
        const decode = jwt.verify(token, process.env.JWT_SECRET);

        if (!decode) {
            return next(errorHandler(400, "Invalid user"));
        }

        //USER IS VERIFY
        const user = await User.findById(decode.userId);
        console.log("decoded userId", decode.userId)
        if (!user) {
            return next(errorHandler(403, "User not found"));
        }

        req.user = user;
        req.userId = user._id;
        next();

    } catch (error) {
        console.log("Error in verify user", error);
    }
}


//CHECK USER IS ADMIN ?
export const isAdmin = async (req,res,next) => {
    try {
        const user  = await User.findById(req.userId);
        console.log(req.userId);
        
        if(user.isAdmin){
            console.log("isAdmin ", user.isAdmin)
            next();
        }else{
            return next(errorHandler(400, "Only admin can access"));
        }
    } catch (error) {
        console.log("Error in isAdmin ", error);
    }
}