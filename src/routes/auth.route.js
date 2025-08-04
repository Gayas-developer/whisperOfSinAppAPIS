import express from "express";
import AuthenticationController from "../controller/AuthenticationController.js";
import { isAdmin, verifyUser } from "../middleware/verifyUser.middleware.js";

const router = express.Router();

// router.post("/signup", AuthenticationController.signUpController);
router.post("/signup", AuthenticationController.signUpController);
router.post("/verify-signup", AuthenticationController.verifySignup);
router.post("/resend-otp-signup", AuthenticationController.resendOTPSignup);
router.post("/login", AuthenticationController.loginController);
router.post("/forgotpassword", AuthenticationController.forgotPassword);
router.post("/verifycode/:emailToken", AuthenticationController.verifyCode);
router.post("/resendotp", AuthenticationController.resendOTP);
router.post(
  "/changepassword/:validUserToken",
  AuthenticationController.changedPassword
);

//Admin
router.post("/adminlogin", AuthenticationController.adminLoginController);

export default router;
