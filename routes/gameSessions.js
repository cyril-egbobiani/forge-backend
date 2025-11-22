const express = require("express");
const router = express.Router();
const GameSession = require("../models/GameSession");
const { authenticateToken, optionalAuth } = require("../middleware/auth");
const User = require("../models/User");

// Create a new game session (record a game played)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { gameType, score, totalQuestions, scorePercentage, timeTaken } =
      req.body;
    const userId = req.user._id;
    const username = req.user.name;

    const session = await GameSession.create({
      userId,
      username,
      gameType,
      score,
      totalQuestions,
      scorePercentage,
      timeTaken,
    });
    res.status(201).json({ success: true, session });
  } catch (error) {
    console.error("Create game session error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error recording game session" });
  }
});

// Get leaderboard (top scores for a game type)
router.get("/leaderboard", optionalAuth, async (req, res) => {
  try {
    const { gameType = "lightAndPath", limit = 20 } = req.query;
    // Aggregate by user, get highest score per user for the gameType
    const leaderboard = await GameSession.aggregate([
      { $match: { gameType } },
      { $sort: { score: -1, timeTaken: 1 } },
      {
        $group: {
          _id: "$userId",
          username: { $first: "$username" },
          bestScore: { $max: "$score" },
          averageScore: { $avg: "$scorePercentage" },
          gamesPlayed: { $sum: 1 },
          totalScore: { $sum: "$score" },
        },
      },
      { $sort: { bestScore: -1, totalScore: -1 } },
      { $limit: parseInt(limit) },
    ]);
    res.json({ success: true, leaderboard });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching leaderboard" });
  }
});

// Get recent sessions for a user
router.get("/recent", authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const sessions = await GameSession.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);
    res.json({ success: true, sessions });
  } catch (error) {
    console.error("Get recent sessions error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching sessions" });
  }
});

module.exports = router;
