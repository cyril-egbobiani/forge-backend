const express = require("express");
const router = express.Router();
const Teaching = require("../models/Teaching");
const {
  authenticateToken,
  requireRole,
  optionalAuth,
} = require("../middleware/auth");
const aiService = require("../services/aiService");
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

// POST interactive AI study query (Mobile App users)
router.post("/ai-query", optionalAuth, async (req, res) => {
  try {
    const { question, teachingTitle, speaker, scripture, transcript, keyMoment, chatHistory } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ success: false, message: "Question is required" });
    }

    const result = await aiService.askAiStudy({
      question,
      teachingTitle,
      speaker,
      scripture,
      transcript,
      keyMoment,
      chatHistory,
    });

    res.json(result);
  } catch (error) {
    console.error("AI Query Error:", error);
    res.status(500).json({
      success: false,
      message: "AI Study processing error",
      error: error.message,
    });
  }
});

// POST interactive Key Moment Deep-Dive (Mobile App users)
router.post("/moment-ai", optionalAuth, async (req, res) => {
  try {
    const { momentTitle, momentSubtitle, timestamp, scripture, takeaway, teachingTitle, speaker } = req.body;

    const result = await aiService.getKeyMomentInsight({
      momentTitle,
      momentSubtitle,
      timestamp,
      scripture,
      takeaway,
      teachingTitle,
      speaker,
    });

    res.json(result);
  } catch (error) {
    console.error("Key Moment AI Error:", error);
    res.status(500).json({
      success: false,
      message: "Key Moment AI processing error",
      error: error.message,
    });
  }
});

// GET most recent featured teaching (for mobile home screen)
router.get("/recent", optionalAuth, async (req, res) => {
  try {
    const teaching = await Teaching.findOne({ isPublished: true })
      .sort({ createdAt: -1 }) || await Teaching.findOne().sort({ createdAt: -1 });

    if (!teaching) {
      return res.status(404).json({ success: false, message: "No teachings found" });
    }

    res.json({
      success: true,
      data: teaching,
    });
  } catch (error) {
    console.error("Get recent teaching error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all teachings
router.get("/", optionalAuth, async (req, res) => {
  try {
    const teachings = await Teaching.find()
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(teachings);
  } catch (error) {
    console.error("Get teachings error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Get AI Insights & Key Moments by ID
router.get("/:id/insights", async (req, res) => {
  try {
    const teaching = await Teaching.findById(req.params.id);
    if (!teaching) {
      return res.status(404).json({ success: false, message: "Teaching not found" });
    }
    res.json({
      success: true,
      data: {
        teachingId: teaching._id,
        title: teaching.title,
        speaker: teaching.speaker?.name || "Pastor",
        aiInsights: teaching.aiInsights,
        keyMoments: teaching.keyMoments || [],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
      const { title, speaker, description, series, scripture, duration, aiInsights, keyMoments } =
        req.body;

      const teaching = new Teaching({
        title,
        speaker: {
          name: speaker || "Pastor",
          profilePicture: null,
        },
        description,
        series: {
          name: series,
          description: null,
          order: 1,
        },
        scripture: {
          reference: scripture,
          text: null,
        },
        duration: parseInt(duration) || 0,
        audioUrl: null,
        aiInsights: aiInsights || undefined,
        keyMoments: Array.isArray(keyMoments) ? keyMoments : [],
        datePreached: new Date(),
      });

      await teaching.save();
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
          name: speaker,
          profilePicture: null,
        },
        description,
        series: {
          name: series,
          description: null,
          order: 1,
        },
        scripture: {
          reference: scripture,
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
