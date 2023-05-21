import express from "express";
import {
  addToPlaylist,
  changePassword,
  deleteProfile,
  deleteUser,
  forgotPassword,
  getAllUsers,
  login,
  logout,
  profile,
  register,
  removeFromPlaylist,
  resetPassword,
  updateProfile,
  updateProfilePicture,
  updateUserRole,
} from "../controllers/userController.js";
import { authorizeAdmin, isAuthenticated } from "../middlewares/auth.js";
import singleUpload from "../middlewares/multer.js";

const router = express.Router();

router.route(`/register`).post(singleUpload, register);

router.route(`/login`).post(login);

router.route(`/logout`).get(logout);

router.route(`/me`).get(isAuthenticated, profile);

router.route(`/me`).delete(isAuthenticated, deleteProfile);

router.route(`/changepassword`).put(isAuthenticated, changePassword);

router.route(`/updateprofile`).put(isAuthenticated, updateProfile);

router
  .route(`/updateprofilepicture`)
  .put(isAuthenticated, singleUpload, updateProfilePicture);

router.route(`/forgotpassword`).post(forgotPassword);

router.route(`/resetpassword/:token`).put(resetPassword);

router.route(`/addtoplatlist`).post(isAuthenticated, addToPlaylist);

router.route(`/removefromplaylist`).delete(isAuthenticated, removeFromPlaylist);

//
// Admin Routes

router.route(`/admin/users`).get(isAuthenticated, authorizeAdmin, getAllUsers);

router
  .route(`/admin/user/:id`)
  .put(isAuthenticated, authorizeAdmin, updateUserRole)
  .delete(isAuthenticated, authorizeAdmin, deleteUser);

export default router;
