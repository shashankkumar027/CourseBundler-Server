import mongoose from "mongoose";

const schema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Please enter course title."],
    minLength: [4, "Titel must be at least 4 characters."],
    maxLength: [80, "Titel can't exceed 80 characters."],
  },

  description: {
    type: String,
    required: [true, "Please enter course title."],
    minLength: [20, "Titel must be at least 20 characters."],
  },
  lectures: [
    {
      title: {
        type: String,
        required: [true, "Please enter the video title."],
      },
      description: {
        type: String,
        required: [true, "Please enter the video description."],
      },
      video: {
        public_id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },
    },
  ],

  poster: {
    public_id: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
  },
  views: {
    type: Number,
    default: 0,
  },
  numOfVideos: {
    type: Number,
    default: 0,
  },
  category: {
    type: String,
    required: [true, "Please enter the Course Category."],
  },
  createdBy: {
    type: String,
    required: [true, "Please enter the Course CreatedBy."],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export const Course = mongoose.model("Course", schema);
