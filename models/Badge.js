const mongoose = require("mongoose");

const badgeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true }, // icon name or url
  color: { type: String, default: "#FFD700" },
  unlockCriteria: { type: String }, // e.g. "score >= 1000", "gamesPlayed >= 10"
});

module.exports = mongoose.model("Badge", badgeSchema);
