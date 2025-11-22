const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema({
  roomId: { type: String, required: true }, // group or private room
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  senderName: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
