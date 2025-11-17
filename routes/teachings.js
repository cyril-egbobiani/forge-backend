const express = require("express");
const router = express.Router();
const Teaching = require("../models/Teaching");
const {
  authenticateToken,
  requireRole,
  optionalAuth,
} = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

// Configure multer for audio uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed!"));
    }
  },
});

// Get all teachings
router.get("/", optionalAuth, async (req, res) => {
  try {
    console.log("📖 Getting all teachings...");
    const teachings = await Teaching.find()
      .sort({ datePreached: -1 })
      .limit(50);
    console.log(`📖 Found ${teachings.length} teachings`);
    console.log(
      "📖 Sample teaching:",
      teachings.length > 0 ? teachings[0].title : "No teachings"
    );
    if (teachings.length > 0) {
      console.log(
        "📖 Sample JSON structure:",
        JSON.stringify(teachings[0], null, 2)
      );
    }
    res.json(teachings);
    console.log("📖 Response sent successfully");
  } catch (error) {
    console.error("Get teachings error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get teaching by ID
router.get("/:id", async (req, res) => {
  try {
    const teaching = await Teaching.findById(req.params.id);
    if (!teaching) {
      return res.status(404).json({ error: "Teaching not found" });
    }
    res.json(teaching);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new teaching (Pastor/Admin only) - JSON only
router.post(
  "/",
  authenticateToken,
  requireRole("pastor", "admin"),
  async (req, res) => {
    try {
      console.log("📖 Creating teaching with data:", req.body);
      const { title, speaker, description, series, scripture, duration } =
        req.body;

      const teaching = new Teaching({
        title,
        speaker: {
          name: speaker, // speaker is a string, so we put it in speaker.name
          profilePicture: null,
        },
        description,
        series: {
          name: series, // series is a string, so we put it in series.name
          description: null,
          order: 1,
        },
        scripture: {
          reference: scripture, // scripture is a string, so we put it in scripture.reference
          text: null,
        },
        duration: parseInt(duration),
        audioUrl: null, // No audio file for JSON requests
        datePreached: new Date(),
      });

      console.log("🔍 About to save teaching:", teaching);
      await teaching.save();
      console.log("✅ Teaching saved successfully:", teaching._id);
      res.status(201).json(teaching);
    } catch (error) {
      console.error("Create teaching error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Create new teaching with audio file (Pastor/Admin only)
router.post(
  "/upload",
  authenticateToken,
  requireRole("pastor", "admin"),
  upload.single("audioFile"),
  async (req, res) => {
    try {
      const { title, speaker, description, series, scripture, duration } =
        req.body;

      const teaching = new Teaching({
        title,
        speaker: {
          name: speaker, // speaker is a string, so we put it in speaker.name
          profilePicture: null,
        },
        description,
        series: {
          name: series, // series is a string, so we put it in series.name
          description: null,
          order: 1,
        },
        scripture: {
          reference: scripture, // scripture is a string, so we put it in scripture.reference
          text: null,
        },
        duration: parseInt(duration),
        audioUrl: req.file ? `/uploads/${req.file.filename}` : null,
        datePreached: new Date(),
      });

      await teaching.save();
      res.status(201).json(teaching);
    } catch (error) {
      console.error("Create teaching with file error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Get teachings by series
router.get("/series/:seriesName", async (req, res) => {
  try {
    const teachings = await Teaching.find({
      series: req.params.seriesName,
    }).sort({ datePreached: -1 });
    res.json(teachings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update teaching (Admin only)
router.put("/:id", async (req, res) => {
  try {
    const teaching = await Teaching.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!teaching) {
      return res.status(404).json({ error: "Teaching not found" });
    }
    res.json(teaching);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
