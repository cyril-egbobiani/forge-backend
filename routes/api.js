const express = require("express");
const router = express.Router();

// Basic health check
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Forge Church Backend is running!",
    timestamp: new Date().toISOString(),
  });
});

// Get app info
router.get("/info", (req, res) => {
  res.json({
    appName: process.env.APP_NAME || "Forge Church App",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  });
});

module.exports = router;
