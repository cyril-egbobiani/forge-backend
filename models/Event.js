const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Event title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Event description is required"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: true,
    },
    location: {
      venue: String,
      address: String,
      coordinates: {
        latitude: Number,
        longitude: Number,
      },
    },
    category: {
      type: String,
      enum: [
        "worship",
        "bible-study",
        "fellowship",
        "outreach",
        "youth",
        "children",
        "special",
        "conference",
      ],
      default: "fellowship",
    },
    organizer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    featuredImage: {
      type: String,
      default: null,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
    requiresRSVP: {
      type: Boolean,
      default: false,
    },
    maxAttendees: {
      type: Number,
      default: null,
    },
    attendees: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        rsvpDate: {
          type: Date,
          default: Date.now,
        },
        status: {
          type: String,
          enum: ["going", "maybe", "not-going"],
          default: "going",
        },
      },
    ],
    tags: [
      {
        type: String,
        lowercase: true,
      },
    ],
    reminder: {
      enabled: {
        type: Boolean,
        default: true,
      },
      timeBeforeEvent: {
        type: Number,
        default: 60, // minutes
      },
    },
    photos: [
      {
        url: String,
        caption: String,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        uploadedAt: {
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

module.exports = mongoose.model("Event", eventSchema);
