const express = require("express");
const router = express.Router();
const PrayerRequest = require("../models/PrayerRequest");
const { authenticateToken, optionalAuth } = require("../middleware/auth");

// Get all prayer requests
router.get("/", optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, category, urgency } = req.query;
    const skip = (page - 1) * limit;

    const filter = { status: "active" };
    if (category) filter.category = category;
    if (urgency) filter.urgencyLevel = urgency;

    const prayerRequests = await PrayerRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("user", "name role")
      .populate("prayedBy.user", "name");

    const total = await PrayerRequest.countDocuments(filter);

    res.json({
      success: true,
      prayerRequests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get prayer requests error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching prayer requests",
    });
  }
});

// Get prayer request by ID
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const prayerRequest = await PrayerRequest.findById(req.params.id)
      .populate("user", "name role")
      .populate("prayedBy.user", "name");

    if (!prayerRequest) {
      return res.status(404).json({
        success: false,
        message: "Prayer request not found",
      });
    }

    res.json({
      success: true,
      prayerRequest,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new prayer request
router.post("/", authenticateToken, async (req, res) => {
  try {
    console.log("🙏 Creating prayer request with data:", req.body);
    const { title, description, category, isAnonymous, urgencyLevel } =
      req.body;

    const prayerRequest = new PrayerRequest({
      title,
      description,
      category: category || "general",
      isAnonymous: isAnonymous || false,
      urgencyLevel: urgencyLevel || "normal",
      user: req.user._id,
      status: "active",
    });

    // Add to user's prayer requests
    req.user.prayerRequests.push(prayerRequest._id);
    await req.user.save();

    await prayerRequest.save();

    // Populate user data for response
    await prayerRequest.populate("user", "name role");

    // Emit socket event for real-time updates
    req.app.get("io").emit("new-prayer-request", prayerRequest);

    res.status(201).json({
      success: true,
      message: "Prayer request created successfully",
      prayerRequest,
    });
  } catch (error) {
    console.error("Create prayer request error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Add prayer support (someone is praying for this request)
router.post("/:id/pray", authenticateToken, async (req, res) => {
  try {
    const prayerRequest = await PrayerRequest.findById(req.params.id);
    if (!prayerRequest) {
      return res.status(404).json({
        success: false,
        message: "Prayer request not found",
      });
    }

    // Add user to praying list
    const alreadyPrayed = prayerRequest.prayedBy.some(
      (prayer) => prayer.user.toString() === req.user._id.toString()
    );

    if (!alreadyPrayed) {
      prayerRequest.prayedBy.push({
        user: req.user._id,
        prayedAt: new Date(),
      });
      prayerRequest.prayerCount += 1;
      await prayerRequest.save();
    }

    res.json({
      success: true,
      message: "Added to prayer list",
      prayerCount: prayerRequest.prayerCount,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update prayer request (answered prayers, updates)
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { status, update, isAnswered } = req.body;

    const prayerRequest = await PrayerRequest.findById(req.params.id);
    if (!prayerRequest) {
      return res.status(404).json({ error: "Prayer request not found" });
    }

    if (status) prayerRequest.status = status;
    if (isAnswered !== undefined) prayerRequest.isAnswered = isAnswered;
    if (update) {
      prayerRequest.updates.push({
        message: update,
        date: new Date(),
      });
    }

    await prayerRequest.save();

    // Populate user data for response
    await prayerRequest.populate("user", "name role");

    // Emit socket event for real-time updates
    req.app.get("io").emit("prayer-request-update", prayerRequest);

    res.json({
      success: true,
      message: "Prayer request updated successfully",
      prayerRequest,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add comment to prayer request
router.post("/:id/comments", authenticateToken, async (req, res) => {
  try {
    const { text, isEncouragement = true } = req.body;

    const prayerRequest = await PrayerRequest.findById(req.params.id);
    if (!prayerRequest) {
      return res.status(404).json({
        success: false,
        message: "Prayer request not found",
      });
    }

    const newComment = {
      user: req.user._id,
      text,
      isEncouragement,
      createdAt: new Date(),
    };

    prayerRequest.comments.push(newComment);
    await prayerRequest.save();

    // Populate the new comment with user data
    await prayerRequest.populate("comments.user", "name role");

    // Get the newly added comment
    const addedComment =
      prayerRequest.comments[prayerRequest.comments.length - 1];

    // Emit socket event for real-time updates
    req.app.get("io").emit("prayer-comment-added", {
      prayerId: prayerRequest._id,
      comment: addedComment,
    });

    res.status(201).json({
      success: true,
      message: "Comment added successfully",
      comment: addedComment,
    });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({
      success: false,
      message: "Error adding comment",
      error: error.message,
    });
  }
});

// Get comments for a prayer request
router.get("/:id/comments", optionalAuth, async (req, res) => {
  try {
    const prayerRequest = await PrayerRequest.findById(req.params.id).populate(
      "comments.user",
      "name role"
    );

    if (!prayerRequest) {
      return res.status(404).json({
        success: false,
        message: "Prayer request not found",
      });
    }

    res.json({
      success: true,
      comments: prayerRequest.comments,
    });
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching comments",
      error: error.message,
    });
  }
});

// Get prayer requests by category
router.get("/category/:category", optionalAuth, async (req, res) => {
  try {
    const prayerRequests = await PrayerRequest.find({
      category: req.params.category,
      status: "active",
    })
      .sort({ createdAt: -1 })
      .populate("user", "name role")
      .populate("prayedBy.user", "name");

    res.json({
      success: true,
      category: req.params.category,
      prayerRequests,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
