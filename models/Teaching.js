const mongoose = require("mongoose");

const teachingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Teaching title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Teaching description is required"],
    },
    speaker: {
      name: {
        type: String,
        required: true,
        default: "Pastor",
      },
      profilePicture: {
        type: String,
        default: null,
      },
    },
    audioFile: {
      filename: String,
      originalName: String,
      path: String,
      size: Number,
      duration: Number, // in seconds
      format: String,
    },
    videoFile: {
      filename: String,
      originalName: String,
      path: String,
      size: Number,
      duration: Number, // in seconds
      format: String, // mp4, webm, etc.
      thumbnail: String, // thumbnail image path
    },
    // YouTube video integration
    youtubeVideoId: {
      type: String,
      default: null,
    },
    youtubeUrl: {
      type: String,
      default: null,
    },
    // Video metadata
    videoThumbnailUrl: {
      type: String,
      default: null,
    },
    videoDuration: {
      type: Number, // in seconds
      default: null,
    },
    videoFormat: {
      type: String, // 'youtube', 'mp4', 'webm', etc.
      default: null,
    },
    series: {
      name: String,
      description: String,
      order: Number, // Position in series
    },
    scripture: {
      reference: String, // e.g., "John 3:16"
      text: String,
    },
    tags: [
      {
        type: String,
        lowercase: true,
      },
    ],
    transcript: {
      type: String,
      default: null,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishDate: {
      type: Date,
      default: null,
    },
    featuredImage: {
      type: String,
      default: null,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    playCount: {
      type: Number,
      default: 0,
    },
    likes: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        text: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for search functionality
teachingSchema.index({
  title: "text",
  description: "text",
  transcript: "text",
  "speaker.name": "text",
  "series.name": "text",
});

module.exports = mongoose.model("Teaching", teachingSchema);
