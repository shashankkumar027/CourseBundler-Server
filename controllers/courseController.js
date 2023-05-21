import { catchAsyncError } from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../utils/errorHandler.js";
import { Course as Coures, Course } from "../models/CourseModel.js";
import getDataUri from "../utils/dataUri.js";
import cloudinary from "cloudinary";
import { Stats } from "../models/Stats.js";

export const getAllCourses = catchAsyncError(async (req, res, next) => {
  const keyword = req.query.keyword || "";
  const category = req.query.category || "";

  const courses = await Coures.find({
    title: {
      $regex: keyword,
      $options: "i",
    },
    category: {
      $regex: category,
      $options: "i",
    },
  }).select("-lectures");

  res.status(200).json({
    success: true,
    courses,
  });
});

export const createCourse = catchAsyncError(async (req, res, next) => {
  const { title, description, category, createdBy } = req.body;

  if (!title || !description || !category || !createdBy)
    return next(new ErrorHandler("Please add all fields", 400));

  const file = req.file;

  const fileUri = getDataUri(file);

  const myCloud = await cloudinary.v2.uploader.upload(fileUri.content);

  await Coures.create({
    title,
    description,
    category,
    createdBy,
    poster: {
      public_id: myCloud.public_id,
      url: myCloud.secure_url,
    },
  });

  res.status(201).json({
    success: true,
    message: "Course Created Successfully. You can add lectures now.",
  });
});

// Get Course Lectures
export const getCourseLectures = catchAsyncError(async (req, res, next) => {
  const courses = await Coures.findById(req.params.id);

  if (!courses) return next(new ErrorHandler("Course Not Found", 404));

  courses.views += 1;

  await courses.save();

  res.status(200).json({
    success: true,
    lectures: courses.lectures,
  });
});

//Cloudinary Video upload limit => Max Video Size 100mb
// Add Course Lectures
export const addLecture = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { title, description } = req.body;

  if (!title || !description)
    return next(new ErrorHandler("Please add all fields", 400));

  const course = await Coures.findById(id);

  if (!course) return next(new ErrorHandler("Course Not Found", 404));

  // Upload file here!

  const file = req.file;

  const fileUri = getDataUri(file);

  const myCloud = await cloudinary.v2.uploader.upload(fileUri.content, {
    resource_type: "video",
  });

  course.lectures.push({
    title,
    description,
    video: {
      public_id: myCloud.public_id,
      url: myCloud.secure_url,
    },
  });

  course.numOfVideos = course.lectures.length;

  await course.save();

  res.status(201).json({
    success: true,
    message: "Lecture Added To Course!",
  });
});

// Delete Course

export const deleteCourse = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  const course = await Coures.findById(id);

  if (!course) return next(new ErrorHandler("Course Not Found", 404));

  await cloudinary.v2.uploader.destroy(course.poster.public_id);

  for (let i = 0; i < course.lectures.length; i++) {
    const singleLecture = course.lectures[i];
    await cloudinary.v2.uploader.destroy(singleLecture.video.public_id, {
      resource_type: "video",
    });
  }
  // .remove() function is giving error so use .deleteOne().
  await course.deleteOne();

  res.status(200).json({
    success: true,
    message: "Course Deleted Successfully!",
  });
});

// Delete Lecture
export const deleteLecture = catchAsyncError(async (req, res, next) => {
  const { courseId, lectureId } = req.query;

  const course = await Coures.findById(courseId);

  if (!course) return next(new ErrorHandler("Course Not Found", 404));

  const lecture = course.lectures.find((item) => {
    if (item._id.toString() === lectureId.toString()) return item;
  });
  // Removing lecture video from cloudinary
  await cloudinary.v2.uploader.destroy(lecture.video.public_id, {
    resource_type: "video",
  });
  // Removing lecture from mongoDB
  course.lectures = course.lectures.filter((item) => {
    if (item._id.toString() !== lectureId.toString()) return item;
  });

  course.numOfVideos = course.lectures.length;

  await course.save();

  res.status(200).json({
    success: true,
    message: "Lecture Deleted Successfully!",
  });
});

Course.watch().on("change", async () => {
  const stats = await Stats.find({}).sort({ createdAt: "desc" }).limit(1);

  const courses = await Coures.find({});

  let totalViews = 0;

  for (let i = 0; i < courses.length; i++) {
    totalViews += courses[i].views;
  }

  stats[0].views = totalViews;
  stats[0].createdAt = new Date(Date.now());

  await stats[0].save();
});
