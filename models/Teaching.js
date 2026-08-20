const mongoose = require("mongoose");

const keyMomentSchema = new mongoose.Schema({
  timestamp: {
    type: String,
    required: true,
  },
  seconds: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: "",
  },
  scripture: {
    type: String,
    default: "",
  },
  takeaway: {
    type: String,
    default: "",
  },
});

const scriptureRefSchema = new mongoose.Schema({
  reference: {
    type: String,
    required: true,
  },
  context: {
    type: String,
    default: "",
  },
  greekExegesis: {
    type: String,
    default: "",
  },
});

const aiInsightsSchema = new mongoose.Schema({
  coreThesis: {
    type: String,
    default: "",
  },
  theologicalContext: {
    type: String,
    default: "",
  },
  scriptureReferences: [scriptureRefSchema],
  reflectionPrompts: [
    {
      type: String,
    },
  ],
  generatedAt: {
    type: Date,
    default: Date.now,
  },
});

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
        default: "Pastor Cyril Thompson",
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
      duration: Number,
      format: String,
    },
    videoFile: {
      filename: String,
      originalName: String,
      path: String,
      size: Number,
      duration: Number,
      format: String,
      thumbnail: String,
    },
    youtubeVideoId: {
      type: String,
      default: null,
    },
    youtubeUrl: {
      type: String,
      default: null,
    },
    videoThumbnailUrl: {
      type: String,
      default: null,
    },
    videoDuration: {
      type: Number,
      default: null,
    },
    videoFormat: {
      type: String,
      default: null,
    },
    series: {
      name: String,
      description: String,
      order: Number,
    },
    scripture: {
      reference: String,
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
    aiInsights: {
      type: aiInsightsSchema,
      default: () => ({}),
    },
    keyMoments: [keyMomentSchema],
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

teachingSchema.index({
  title: "text",
  description: "text",
  transcript: "text",
  "speaker.name": "text",
  "series.name": "text",
});

module.exports = mongoose.model("Teaching", teachingSchema);
