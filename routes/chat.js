const express = require("express");
const router = express.Router();
const ChatMessage = require("../models/ChatMessage");
const { authenticateToken } = require("../middleware/auth");

// Get messages for a room
router.get("/:roomId", authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await ChatMessage.find({ roomId }).sort({ createdAt: 1 });
    res.json({ success: true, messages });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Error fetching messages" });
  }
});

// Post a new message
router.post("/:roomId", authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content } = req.body;
    const senderId = req.user._id;
    const senderName = req.user.name;
    const message = await ChatMessage.create({
      roomId,
      senderId,
      senderName,
      content,
    });
    res.status(201).json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error posting message" });
  }
});

module.exports = router;
