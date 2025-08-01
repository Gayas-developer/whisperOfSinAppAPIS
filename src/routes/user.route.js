import express from "express"
import {verifyUser} from "../middleware/verifyUser.middleware.js"
import UserController from "../controller/UserController.js";
import  userUpload  from "../middleware/multer.middleware.js";

const router = express.Router();

router.get("/get/:userId",verifyUser, UserController.getUser);
router.put("/update-profile/:pid",verifyUser,userUpload.single("profilePhoto"), UserController.updateUser);

export default router;