const express = require("express");
const router = express.Router();
const Badge = require("../models/Badge");
const UserBadge = require("../models/UserBadge");
const { authenticateToken, requireRole } = require("../middleware/auth");

// Get all badges
router.get("/", async (req, res) => {
  try {
    const badges = await Badge.find();
    res.json({ success: true, badges });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching badges" });
  }
});

// Get user's unlocked badges
router.get("/user/:userId", authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const userBadges = await UserBadge.find({ userId }).populate("badgeId");
    res.json({ success: true, userBadges });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching user badges" });
  }
});

// Unlock a badge for a user
router.post("/unlock", authenticateToken, async (req, res) => {
  try {
    const { badgeId } = req.body;
    const userId = req.user._id;
    // Prevent duplicate unlocks
    const exists = await UserBadge.findOne({ userId, badgeId });
    if (exists)
      return res
        .status(400)
        .json({ success: false, message: "Badge already unlocked" });
    const userBadge = await UserBadge.create({ userId, badgeId });
    res.status(201).json({ success: true, userBadge });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error unlocking badge" });
  }
});

module.exports = router;
