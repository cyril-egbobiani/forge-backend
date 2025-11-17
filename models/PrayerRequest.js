const mongoose = require("mongoose");

const prayerRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false, // Make optional until authentication is implemented
    },
    title: {
      type: String,
      required: [true, "Prayer request title is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Prayer request description is required"],
    },
    category: {
      type: String,
      enum: [
        "health",
        "family",
        "work",
        "spiritual",
        "financial",
        "relationships",
        "other",
      ],
      default: "other",
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    isUrgent: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "answered", "closed"],
      default: "active",
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    prayerCount: {
      type: Number,
      default: 0,
    },
    prayedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        prayedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    updates: [
      {
        text: String,
        createdBy: {
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
        isEncouragement: {
          type: Boolean,
          default: true,
        },
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

module.exports = mongoose.model("PrayerRequest", prayerRequestSchema);
