import User from "../model/user.model.js";
import { errorHandler } from "../utils/errorHandler.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import path, { dirname } from "path";
import fs from "fs";
import { sendEmail } from "../config/nodemailer.js";
import { profile } from "console";
const ___fileName = fileURLToPath(import.meta.url);
const ___dirname = dirname(___fileName);
const verifyCodeEmailTemp = fs.readFileSync(
  path.join(___dirname, "../templates/verifyCode.html"),
  "utf-8"
);

// const signUpController = async (req, res, next) => {
//   try {
//     const { fullName, email, password } = req.body;

//     if (
//       !fullName ||
//       !email ||
//       !password ||
//       fullName === "" ||
//       email === "" ||
//       password === ""
//     ) {
//       return next(errorHandler(404, "All fields are required"));
//     }

//     const user = await User.findOne({ email });

//     if (user) {
//       return next(errorHandler(401, "User is already exist"));
//     }

//     const hashedPassword = bcrypt.hashSync(password,10);

//     const newUser = new User({
//       fullName,
//       email,
//       password: hashedPassword,
//     });

//     await newUser.save();

//     const token = jwt.sign(
//       { userId: newUser._id, isAdmin: newUser.isAdmin },
//       process.env.JWT_SECRET
//     );

//     res.status(201).json( {
//       token,
//       user: {
//         _id: newUser._id,
//       fullName: fullName,
//       email: email,
//       isAdmin: newUser.isAdmin,
//       profilePhoto: newUser.profilePhoto ? newUser.profilePhoto : null,
//   }});
//   } catch (error) {
//     console.log(error);
//     next();
//   }
// };

// New controller for user signup with email verification
const signUpController = async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;

    if (
      !fullName ||
      !email ||
      !password ||
      fullName === "" ||
      email === "" ||
      password === ""
    ) {
      return next(errorHandler(404, "All fields are required"));
    }

    const user = await User.findOne({ email });

    if (user) {
      // Yahan tabdeeli ki gayi hai
      // Agar user pehle se mojood hai, to check karein ke woh verified hai ya nahi
      if (user.isVerified) {
        return next(errorHandler(401, "User is already exist"));
      } else {
        // Agar user exist karta hai lekin verified nahi hai, to usay ek naya OTP bhej dein
        const otp = user.generateOtp();
        await user.save();
        
        // Email bhejne ka function
        await sendEmail({
          email: email,
          subject: "Verify Your Email",
          message: verifyCodeEmailTemp
            .replace("{{user.name}}", user.fullName)
            .replace("{{otp}}", otp),
          attachments: [],
        });
        
        return res.status(200).json({
          message: "User exists but not verified. A new OTP has been sent.",
          email,
        });
      }
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    
    // Naya user banate waqt isVerified ko false set karein
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword,
      isVerified: false,
    });

    const otp = newUser.generateOtp();
    await newUser.save();

    await sendEmail({
      email: email,
      subject: "Verify Your Email",
      message: verifyCodeEmailTemp
        .replace("{{user.name}}", newUser.fullName)
        .replace("{{otp}}", otp),
      attachments: [],
    });

    res.status(201).json({
      message: "User created. OTP sent to email for verification.",
      email: newUser.email,
    });
  } catch (error) {
    console.error("Error in signUpController:", error);
    next(errorHandler(500, "Internal Server Error"));
  }
};

// New controller to verify the OTP for signup
const verifySignup = async (req, res, next) => {
  try {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
      return next(errorHandler(400, "Email and OTP are required"));
    }

    const user = await User.findOne({ email });

    if (!user) {
      return next(errorHandler(404, "User not found"));
    }

    if (user.isVerified) {
      return next(errorHandler(400, "User is already verified"));
    }

    const isMatch = user.otpCode === otpCode;

    if (!isMatch || user.otpCodeExpiry < Date.now()) {
      return next(errorHandler(400, "Invalid or expired OTP"));
    }

    // OTP sahi hone par user ko verified set karein aur OTP details hata dein
    user.isVerified = true;
    user.otpCode = undefined;
    user.otpCodeExpiry = undefined;
    await user.save();

    // Verification ke baad login token generate karein
    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET
    );

    res.status(200).json({
      message: "Email verified successfully",
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        isAdmin: user.isAdmin,
        profilePhoto: user.profilePhoto ? user.profilePhoto : null,
      },
    });
  } catch (error) {
    console.error("Error in verifySignupController:", error);
    next(errorHandler(500, "Internal Server Error"));
  }
};

// New controller to resend OTP for signup verification
const resendOTPSignup = async (req, res, next) => {
  try {
    const { email } = req.body;
    console.log("email" ,email);
    if (!email) {
      return next(errorHandler(400, "Email is required"));
    }

    const user = await User.findOne({ email });

    if (!user) {
      return next(errorHandler(404, "User not found"));
    }

    if (user.isVerified) {
      return next(errorHandler(400, "User is already verified"));
    }

    const otp = user.generateOtp();
    await user.save();

    await sendEmail({
      email: email,
      subject: "New Verification Code",
      message: verifyCodeEmailTemp
        .replace("{{user.name}}", user.fullName)
        .replace("{{otp}}", otp),
      attachments: [],
    });

    res.status(200).json({ message: "New OTP sent successfully", email });
  } catch (error) {
    console.error("Error in resendOTPSignupController:", error);
    next(errorHandler(500, "Internal Server Error"));
  }
};

const loginController = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(errorHandler(400, "All fields are required"));
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return next(errorHandler(404, "User not found"));
    }

    const isMatchPassword = bcrypt.compareSync(password, user.password);

    if (!isMatchPassword) {
      return next(errorHandler(400, "Invalid credenial"));
    }

    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET
    );

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        isAdmin: user.isAdmin,
        profilePhoto: user.profilePhoto ? user.profilePhoto : null,
      },
    });
  } catch (error) {
    console.log("Error in loginControlelr");
    next();
  }
};

const forgotPassword = async (req, res, next) => {
  const { email } = req.body;
  if (!email) {
    return next(errorHandler(400, "Email is required"));
  }
  try {
    const user = await User.findOne({ email });

    if (!user) {
      return next(errorHandler(403, "User not found"));
    }

    const otp = user.generateOtp();
    await user.save();

    //NOTE - APP LOGO PATH FOR EMAIL TEMPLATE
    const imagePath = path.join(___dirname, "../", "hassan.jpg");

    const emailToken = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    await sendEmail({
      email: email,
      subject: "Forgot Password",
      message: verifyCodeEmailTemp
        .replace("{{user.name}}", user.fullName)
        .replace("{{otp}}", otp),
      attachments: [
        {
          filename: "hassan.jpg",
          path: imagePath,
          cid: "logo",
        },
      ],
    });

    res.status(200).json({ messgage: "OTP sent successfully", emailToken });
  } catch (error) {}
};

const resendOTP = async (req, res, next) => {
  try {
    const { emailToken } = req.body;

    if (!emailToken) {
      return next(errorHandler(400, "Unauthorized, No email token provided"));
    }
    const decodeToken = jwt.verify(emailToken, process.env.JWT_SECRET);

    if (!decodeToken) {
      return next(errorHandler(400, "Inavlid token"));
    }

    const user = await User.findOne({ email: decodeToken.email });
    console.log(user);

    if (!user) {
      return next(errorHandler(403, "Email is not register"));
    }

    const otp = user.generateOtp();
    await user.save();

    //NOTE - APP LOGO PATH FOR EMAIL TEMPLATE
    const imagePath = path.join(___dirname, "../", "hassan.jpg");

    const EmailToken = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    await sendEmail({
      email: user.email,
      subject: "Forgot Password",
      message: verifyCodeEmailTemp
        .replace("{{user.name}}", user.fullName)
        .replace("{{otp}}", otp),
      attachments: [
        {
          filename: "hassan.jpeg",
          path: imagePath,
          cid: "logo",
        },
      ],
    });

    res.status(200).json({ messgage: "OTP sent successfully", EmailToken });
  } catch (error) {
    console.log(error);
    next();
  }
};

const verifyCode = async (req, res, next) => {
  try {
    const { emailToken } = req.params;

    console.log(emailToken);

    if (!emailToken) {
      return next(errorHandler(400, "Unauthorized, No email token provided"));
    }
    const decodeToken = await jwt.verify(emailToken, process.env.JWT_SECRET);

    if (!decodeToken) {
      return next(errorHandler(400, "Inavlid token"));
    }

    const user = await User.findOne({ email: decodeToken.email });
    if (!user) {
      return next(errorHandler(403, "Email is not register"));
    }

    const { otpCode } = req.body;

    if (!otpCode) {
      return next(errorHandler(404, "OTP is required"));
    }

    const isMatch = user.otpCode === otpCode;

    if (!isMatch || user.otpCodeExpiry < Date.now()) {
      return next(errorHandler(400, "Invalid OTP"));
    }

    user.otpCode = undefined;
    user.otpCodeExpiry = undefined;
    await user.save();

    const validUserToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "3min",
      }
    );

    res.status(200).json(validUserToken);
  } catch (error) {
    console.log(error);
    next();
  }
};

const changedPassword = async (req, res, next) => {
  try {
    const { validUserToken } = req.params;

    if (!validUserToken) {
      return next(
        errorHandler(400, "Unauthorized, No valid user token provided")
      );
    }

    const decodeToken = await jwt.verify(
      validUserToken,
      process.env.JWT_SECRET
    );

    if (!decodeToken) {
      return next(400, "Invalid valid user token");
    }

    const { newPassword } = req.body;

    const user = await User.findById(decodeToken.userId);

    if (!user) {
      return next(errorHandler(403, "User not found"));
    }
    const hashedNewPassword = bcrypt.hashSync(newPassword);
    user.password = hashedNewPassword;
    await user.save();

    res.status(201).json({ message: "Changed password" });
  } catch (error) {
    console.log(error);
    next();
  }
};

const adminLoginController = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(errorHandler(400, "All fields are required"));
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return next(errorHandler(404, "User not found"));
    }

    if (!user.isAdmin) {
      return next(errorHandler(403, "You are not an admin"));
    }

    const isMatchPassword = bcrypt.compareSync(password, user.password);

    if (!isMatchPassword) {
      return next(errorHandler(400, "Invalid credenial"));
    }

    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET
    );

    res.cookie("adminToken", token, {
      httpOnly: true,
      // secure: process.env.NODE_ENV === "production",
      // sameSite: "strict",
    });

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        isAdmin: user.isAdmin,
        profilePhoto: user.profilePhoto ? user.profilePhoto : null,
      },
    });
  } catch (error) {
    console.log("Error in adminLoginController");
    next();
  }
};  

export default {
  signUpController,
  loginController,
  forgotPassword,
  verifyCode,
  changedPassword,
  resendOTP,
  adminLoginController,
  verifySignup,
  resendOTPSignup
};
