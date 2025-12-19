const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const router = express.Router();
const { authenticateAdmin } = require("../middleware/auth");

// Ensure upload directories exist
const ensureDirectoryExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Create upload directories
ensureDirectoryExists("uploads/images");
ensureDirectoryExists("uploads/audio");
ensureDirectoryExists("uploads/videos");

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath = "uploads/";

    if (file.mimetype.startsWith("image/")) {
      uploadPath += "images/";
    } else if (file.mimetype.startsWith("audio/")) {
      uploadPath += "audio/";
    } else if (file.mimetype.startsWith("video/")) {
      uploadPath += "videos/";
    } else {
      uploadPath += "misc/";
      ensureDirectoryExists(uploadPath);
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    cb(null, `${baseName}-${uniqueSuffix}${extension}`);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    // Audio
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/ogg",
    "audio/aac",
    "audio/m4a",
    // Video
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/webm",
    "video/ogg",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: fileFilter,
});

// Single file upload endpoint
router.post("/single", authenticateAdmin, upload.single("file"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const fileUrl = `/${req.file.path.replace(/\\/g, "/")}`;

    res.json({
      success: true,
      message: "File uploaded successfully",
      data: {
        url: fileUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
      },
    });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({
      success: false,
      message: "File upload failed",
      error: error.message,
    });
  }
});

// Multiple files upload endpoint
router.post(
  "/multiple",
  authenticateAdmin,
  upload.array("files", 10),
  (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No files uploaded",
        });
      }

      const uploadedFiles = req.files.map((file) => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        url: `/${file.path.replace(/\\/g, "/")}`,
        path: file.path,
      }));

      res.json({
        success: true,
        message: `${req.files.length} files uploaded successfully`,
        data: {
          files: uploadedFiles,
        },
      });
    } catch (error) {
      console.error("Multiple files upload error:", error);
      res.status(500).json({
        success: false,
        message: "Files upload failed",
        error: error.message,
      });
    }
  }
);

// Image upload endpoint (specific for events/teachings featured images)
router.post("/image", authenticateAdmin, upload.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded",
      });
    }

    if (!req.file.mimetype.startsWith("image/")) {
      return res.status(400).json({
        success: false,
        message: "File must be an image",
      });
    }

    const imageUrl = `/${req.file.path.replace(/\\/g, "/")}`;

    res.json({
      success: true,
      message: "Image uploaded successfully",
      data: {
        url: imageUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error("Image upload error:", error);
    res.status(500).json({
      success: false,
      message: "Image upload failed",
      error: error.message,
    });
  }
});

// Audio upload endpoint (specific for teachings)
router.post("/audio", authenticateAdmin, upload.single("audio"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No audio file uploaded",
      });
    }

    if (!req.file.mimetype.startsWith("audio/")) {
      return res.status(400).json({
        success: false,
        message: "File must be an audio file",
      });
    }

    const audioUrl = `/${req.file.path.replace(/\\/g, "/")}`;

    res.json({
      success: true,
      message: "Audio file uploaded successfully",
      data: {
        url: audioUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        duration: null, // Could be populated by audio processing library
      },
    });
  } catch (error) {
    console.error("Audio upload error:", error);
    res.status(500).json({
      success: false,
      message: "Audio upload failed",
      error: error.message,
    });
  }
});

// Video upload endpoint (specific for teachings)
router.post("/video", authenticateAdmin, upload.single("video"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No video file uploaded",
      });
    }

    if (!req.file.mimetype.startsWith("video/")) {
      return res.status(400).json({
        success: false,
        message: "File must be a video file",
      });
    }

    const videoUrl = `/${req.file.path.replace(/\\/g, "/")}`;

    res.json({
      success: true,
      message: "Video file uploaded successfully",
      data: {
        url: videoUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        duration: null, // Could be populated by video processing library
      },
    });
  } catch (error) {
    console.error("Video upload error:", error);
    res.status(500).json({
      success: false,
      message: "Video upload failed",
      error: error.message,
    });
  }
});

// Delete file endpoint
router.delete("/:filename", authenticateAdmin, (req, res) => {
  try {
    const filename = req.params.filename;
    const possiblePaths = [
      `uploads/images/${filename}`,
      `uploads/audio/${filename}`,
      `uploads/videos/${filename}`,
      `uploads/misc/${filename}`,
      `uploads/${filename}`,
    ];

    let fileDeleted = false;
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        fileDeleted = true;
        break;
      }
    }

    if (!fileDeleted) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    res.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("File deletion error:", error);
    res.status(500).json({
      success: false,
      message: "File deletion failed",
      error: error.message,
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File size too large. Maximum size is 50MB.",
      });
    }
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files. Maximum is 10 files.",
      });
    }
  }

  res.status(400).json({
    success: false,
    message: error.message || "File upload error",
  });
});

module.exports = router;
