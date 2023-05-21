import express from "express";
import {
  addLecture,
  createCourse,
  deleteCourse,
  deleteLecture,
  getAllCourses,
  getCourseLectures,
} from "../controllers/courseController.js";
import singleUpload from "../middlewares/multer.js";
import {
  authorizeAdmin,
  authorizeSubscribers,
  isAuthenticated,
} from "../middlewares/auth.js";

const router = express.Router();

// Get All Courses
router.route(`/course`).get(getAllCourses);

// Create New Course
router
  .route(`/createcourse`)
  .post(isAuthenticated, authorizeAdmin, singleUpload, createCourse);

// Add Lectures, Delete Course, Get Course Details
router
  .route(`/course/:id`)
  .get(isAuthenticated, authorizeSubscribers, getCourseLectures)
  .post(isAuthenticated, authorizeAdmin, singleUpload, addLecture)
  .delete(isAuthenticated, authorizeAdmin, deleteCourse);

// Delete Lectures.
router.route(`/lecture`).delete(isAuthenticated, authorizeAdmin, deleteLecture);

export default router;
