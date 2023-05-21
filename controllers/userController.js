import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../utils/errorHandler.js";
import { User } from "../models/UserModel.js";
import { Course } from "../models/CourseModel.js";
import { sendToken } from "../utils/sendToken.js";
import { sendEmail } from "../utils/sendEmail.js";
import crypto from "crypto";
import cloudinary from "cloudinary";
import getDataUri from "../utils/dataUri.js";
import { Stats } from "../models/Stats.js";
import { instance } from "../server.js";
import { Payment } from "../models/PaymentModel.js";

// Register User
export const register = catchAsyncError(async (req, res, next) => {
  const { name, email, password } = req.body;

  const file = req.file;

  if (!name || !email || !password || !file)
    return next(new ErrorHandler("Please enter all field", 400));

  let user = await User.findOne({ email });

  if (user) return next(new ErrorHandler("User Already Exist", 409));

  // Upload file on CLoudinary

  const fileUri = getDataUri(file);

  const myCloud = await cloudinary.v2.uploader.upload(fileUri.content);

  user = await User.create({
    name,
    email,
    password,
    avatar: {
      public_id: myCloud.public_id,
      url: myCloud.secure_url,
    },
  });

  sendToken(res, user, "User Registered Successfully!", 201);
});

// Login User
export const login = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password)
    return next(new ErrorHandler("Please enter all field", 400));

  const user = await User.findOne({ email }).select("+password");

  if (!user) return next(new ErrorHandler("Incorrect Email or Password", 401));

  const isPasswordMatched = await user.comparePassword(password);

  if (!isPasswordMatched)
    return next(new ErrorHandler("Incorrect Email or Password", 401));

  sendToken(res, user, `Welcome back, ${user.name}`, 200);
});

// Log-Out User

export const logout = catchAsyncError(async (req, res, next) => {
  res
    .cookie("token", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
      secure: true,
      sameSite: "none",
    })
    .json({
      success: true,
      message: "Logged Out Successfully!",
    });
});

// Get User Profile
export const profile = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  res.status(200).json({
    success: true,
    user,
  });
});

// Delete User Profile
export const deleteProfile = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  const profilePicId = user.avatar.public_id;

  await cloudinary.v2.uploader.destroy(profilePicId);

  // Cancle Subscription
  if (user.subscription && user.subscription.status === "active") {
    const subscriptionId = user.subscription.id;

    let refund = false;

    try {
      await instance.subscriptions.cancel(subscriptionId);
    } catch (error) {
      console.log("* Cancel Subscription Error \n\n " + error);
    }

    const payment = await Payment.findOne({
      razorpay_subscription_id: subscriptionId,
    });

    const gap = Date.now() - payment.createdAt;

    const refundTime = process.env.REFUND_DAYS * 24 * 60 * 60 * 1000;

    if (refundTime > gap) {
      await instance.payments.refund(payment.razorpay_payment_id);
      refund = true;
    }

    await payment.deleteOne();
  }

  await user.deleteOne();

  res
    .status(202)
    .cookie("token", null, {
      expires: new Date(Date.now()),
    })
    .json({
      success: true,
      message: "Your Profile Deleted Successfully!",
    });
});

// Change User Password
export const changePassword = catchAsyncError(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword)
    return next(new ErrorHandler("Please enter all field", 400));

  const user = await User.findById(req.user._id).select("+password");

  const isPasswordMatched = await user.comparePassword(oldPassword);

  if (!isPasswordMatched)
    return next(new ErrorHandler("Old Password Is Incorrect", 400));

  user.password = newPassword;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Password Updated Successfully!",
  });
});

// Update User Profile
export const updateProfile = catchAsyncError(async (req, res, next) => {
  const { name, email } = req.body;

  const user = await User.findById(req.user._id);

  if (name) user.name = name;
  if (email) user.email = email;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Profile Updated Successfully!",
  });
});

// Change Profile Picture
export const updateProfilePicture = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  // Add Cloudinary here

  const file = req.file;

  const fileUri = getDataUri(file);

  const myCloud = await cloudinary.v2.uploader.upload(fileUri.content);

  const desrtoyId = user.avatar.public_id;

  await cloudinary.v2.uploader.destroy(desrtoyId);

  user.avatar = {
    public_id: myCloud.public_id,
    url: myCloud.secure_url,
  };

  await user.save();

  res.status(200).json({
    success: true,
    message: "Profile Picture Updated Successfully!",
  });
});

// Forgot Password
export const forgotPassword = catchAsyncError(async (req, res, next) => {
  const { email } = req.body;

  if (!email) return next(new ErrorHandler(`Please Enter Your Email!`, 400));

  const user = await User.findOne({ email });

  if (!user)
    return next(
      new ErrorHandler(`User with email: ${email} doesn't exist!`, 400)
    );

  const resetToken = await user.getResetToken();

  await user.save();

  const url = `${process.env.FRONTEND_URL}/api/v1/resetpassword/${resetToken}`;

  const message = `To reset your password, \n\n Click to the link below\n\n Link: ${url} \n\n If you have not request then please ignore.\n\nthis link get expires within 15 minutes.`;

  // Send Token Via Email
  await sendEmail(user.email, "CourseBundler Reset Password", message);

  res.status(200).json({
    success: true,
    message: `Reset token send Successfully, To email: ${user.email}`,
  });
});

// Reset Password
export const resetPassword = catchAsyncError(async (req, res, next) => {
  const { token } = req.params;

  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: {
      $gt: Date.now(),
    },
  });

  if (!user)
    return next(
      new ErrorHandler(`Token is Invalid or has been Expired!.`, 401)
    );

  user.password = req.body.password;

  user.resetPasswordExpire = undefined;
  user.resetPasswordToken = undefined;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Password Changed Successfully!",
  });
});

export const addToPlaylist = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  const course = await Course.findById(req.body.id);

  if (!course) return next(new ErrorHandler(`Invalid Course ID!.`, 404));

  const isItemExist = user.playlist.find((item) => {
    if (item.course.toString() === course._id.toString()) return true;
    return false;
  });

  if (isItemExist) return next(new ErrorHandler(`Item Already Exist!`, 409));

  user.playlist.push({
    course: course._id,
    poster: course.poster.url,
  });

  await user.save();

  res.status(201).json({
    success: true,
    message: "Course Added To Playlist!",
  });
});

export const removeFromPlaylist = catchAsyncError(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  const course = await Course.findById(req.query.id);

  if (!course) return next(new ErrorHandler(`Invalid Course ID!.`, 404));

  const newPlaylist = user.playlist.filter((item) => {
    if (item.course.toString() !== course._id.toString()) return item;
  });

  user.playlist = newPlaylist;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Course Removed From Playlist!",
  });
});

//
//
//
// Admin Controllers

// Get All Users
export const getAllUsers = catchAsyncError(async (req, res, next) => {
  const users = await User.find();

  res.status(200).json({
    success: true,
    message: "All Users In Database!",
    users,
  });
});

// Update User Role
export const updateUserRole = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) return next(new ErrorHandler(`Invalid User ID!`, 404));

  user.role === "admin" ? (user.role = "user") : (user.role = "admin");

  await user.save();

  res.status(200).json({
    success: true,
    message: `Role Updated to ${user.role}!`,
  });
});

// Delete User
export const deleteUser = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) return next(new ErrorHandler(`Invalid User ID!`, 404));

  const profilePicId = user.avatar.public_id;

  await cloudinary.v2.uploader.destroy(profilePicId);

  // Cancle Subscription
  if (user.subscription && user.subscription.status === "active") {
    const subscriptionId = user.subscription.id;

    let refund = false;

    try {
      await instance.subscriptions.cancel(subscriptionId);
    } catch (error) {
      console.log("* Cancel Subscription Error \n\n " + error);
    }

    const payment = await Payment.findOne({
      razorpay_subscription_id: subscriptionId,
    });

    const gap = Date.now() - payment.createdAt;

    const refundTime = process.env.REFUND_DAYS * 24 * 60 * 60 * 1000;

    if (refundTime > gap) {
      await instance.payments.refund(payment.razorpay_payment_id);
      refund = true;
    }

    await payment.deleteOne();
  }
  await user.deleteOne();

  res.status(202).json({
    success: true,
    message: `User Deleted Successfully!`,
  });
});

User.watch().on("change", async () => {
  const stats = await Stats.find({}).sort({ createdAt: "desc" }).limit(1);

  const subscription = await User.find({ "subscription.status": "active" });

  stats[0].users = await User.countDocuments();
  stats[0].subscription = subscription.length;
  stats[0].createdAt = new Date(Date.now());

  await stats[0].save();
});
