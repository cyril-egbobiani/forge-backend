const express = require("express");
const router = express.Router();
const Teaching = require("../models/Teaching");
const { authenticateAdmin } = require("../middleware/auth");

// GET all teachings with pagination and filtering (Admin only)
router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      category = "",
      speaker = "",
      series = "",
      status = "",
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter object
    const filter = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { "speaker.name": { $regex: search, $options: "i" } },
        { "series.name": { $regex: search, $options: "i" } },
      ];
    }

    if (category) {
      filter.tags = { $in: [category.toLowerCase()] };
    }

    if (speaker) {
      filter["speaker.name"] = { $regex: speaker, $options: "i" };
    }

    if (series) {
      filter["series.name"] = { $regex: series, $options: "i" };
    }

    if (status) {
      filter.isPublished = status === "published";
    }

    const teachings = await Teaching.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Teaching.countDocuments(filter);

    // Transform teachings to simple frontend format
    const transformedTeachings = teachings.map((teaching) => ({
      id: teaching._id,
      title: teaching.title,
      description: teaching.description,
      content: teaching.transcript || teaching.description,
      author: teaching.speaker?.name || "Pastor", // Simple author field
      scripture: teaching.scripture?.reference,
      category: teaching.tags?.[0] || "sermon",
      tags: teaching.tags || [],
      thumbnailUrl: teaching.featuredImage || teaching.videoThumbnailUrl,
      videoUrl: teaching.videoFile?.path,
      audioUrl: teaching.audioFile?.path,
      youtubeUrl: teaching.youtubeUrl,
      youtubeVideoId: teaching.youtubeVideoId,
      isPublished: teaching.isPublished || false,
      publishDate: teaching.publishDate,
      createdAt: teaching.createdAt,
      updatedAt: teaching.updatedAt,
      series: teaching.series?.name || "",
      status: teaching.isPublished ? "published" : "draft",
      playCount: teaching.playCount || 0,
      downloadCount: teaching.downloadCount || 0,
      likes: teaching.likes?.length || 0,
      comments: teaching.comments?.length || 0,
    }));

    res.json({
      success: true,
      data: transformedTeachings,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching teachings:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch teachings",
      error: error.message,
    });
  }
});

// GET single teaching (Admin only)
router.get("/:id", authenticateAdmin, async (req, res) => {
  try {
    const teaching = await Teaching.findById(req.params.id);

    if (!teaching) {
      return res.status(404).json({
        success: false,
        message: "Teaching not found",
      });
    }

    // Transform teaching to match frontend interface
    const transformedTeaching = {
      id: teaching._id,
      title: teaching.title,
      description: teaching.description,
      content: teaching.description, // Use description as content for now
      author: teaching.speaker.name, // Frontend expects 'author', backend has 'speaker.name'
      scripture: teaching.scripture?.reference || "",
      category: teaching.tags?.[0] || "sermon",
      tags: teaching.tags || [],
      imageUrl: teaching.featuredImage || teaching.videoThumbnailUrl || "",
      videoUrl: teaching.videoFile?.path || teaching.youtubeUrl || "",
      audioUrl: teaching.audioFile?.path || "",
      youtubeUrl: teaching.youtubeUrl || "",
      youtubeVideoId: teaching.youtubeVideoId || "",
      videoThumbnailUrl: teaching.videoThumbnailUrl || "",
      isPublished: teaching.isPublished || false,
      publishDate: teaching.publishDate || teaching.createdAt,
      createdAt: teaching.createdAt,
      updatedAt: teaching.updatedAt,
      // Keep legacy fields for compatibility
      speaker: teaching.speaker.name,
      speakerImage: teaching.speaker.profilePicture,
      duration: formatDuration(teaching.audioFile?.duration || 0),
      image: teaching.featuredImage || "/placeholder-sermon.jpg",
      series: teaching.series?.name || "",
      scriptureText: teaching.scripture?.text || "",
      transcript: teaching.transcript || "",
      status: teaching.isPublished ? "published" : "draft",
      playCount: teaching.playCount || 0,
      downloadCount: teaching.downloadCount || 0,
      likes: teaching.likes?.length || 0,
      comments: teaching.comments?.length || 0,
    };

    res.json({
      success: true,
      data: transformedTeaching,
    });
  } catch (error) {
    console.error("Error fetching teaching:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch teaching",
      error: error.message,
    });
  }
});

// POST create new teaching (Admin only)
router.post("/", authenticateAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      content,
      author, // Simple flat field from frontend
      scripture,
      category,
      tags,
      thumbnailUrl, // Frontend sends thumbnailUrl for images
      videoUrl,
      youtubeUrl,
      youtubeVideoId,
      isPublished,
      publishDate,
    } = req.body;

    console.log("🆕 Create request received:", {
      title,
      author,
      thumbnailUrl,
      youtubeUrl,
      youtubeVideoId,
      category,
    });

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required",
      });
    }

    // Helper function to extract YouTube video ID from URL
    const extractYouTubeId = (url) => {
      if (!url) return null;
      const regex =
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = regex.exec(url);
      return match ? match[1] : null;
    };

    // Process YouTube video data
    let processedYouTubeId = youtubeVideoId;
    let processedYouTubeUrl = youtubeUrl;

    if (youtubeUrl && !youtubeVideoId) {
      processedYouTubeId = extractYouTubeId(youtubeUrl);
    }

    if (youtubeVideoId && !youtubeUrl) {
      processedYouTubeUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
    }

    // Generate YouTube thumbnail if not provided
    let processedThumbnail = thumbnailUrl;
    if (processedYouTubeId && !thumbnailUrl) {
      processedThumbnail = `https://img.youtube.com/vi/${processedYouTubeId}/maxresdefault.jpg`;
    }

    // Transform frontend data to backend model
    const teachingData = {
      title,
      description,
      transcript: content,
      speaker: {
        name: author || "Pastor",
        profilePicture: null,
      },
      videoFile: videoUrl
        ? {
            path: videoUrl,
            originalName: `${title}.mp4`,
            filename: videoUrl.split("/").pop(),
            format: videoUrl.includes("youtube") ? "youtube" : "mp4",
            thumbnail: processedThumbnail,
          }
        : undefined,
      // YouTube integration fields
      youtubeVideoId: processedYouTubeId,
      youtubeUrl: processedYouTubeUrl,
      videoThumbnailUrl: processedThumbnail,
      videoFormat: processedYouTubeId ? "youtube" : videoUrl ? "mp4" : null,
      featuredImage: thumbnailUrl || processedThumbnail,
      tags: Array.isArray(tags)
        ? tags.map((tag) => tag.toLowerCase())
        : category
        ? [category.toLowerCase()]
        : [],
      scripture: {
        reference: scripture || "",
        text: "",
      },
      isPublished: isPublished || false,
      publishDate: isPublished
        ? publishDate
          ? new Date(publishDate)
          : new Date()
        : null,
    };

    const newTeaching = new Teaching(teachingData);
    const savedTeaching = await newTeaching.save();

    // Transform response to match frontend format
    const transformedTeaching = {
      id: savedTeaching._id,
      title: savedTeaching.title,
      description: savedTeaching.description,
      content: savedTeaching.transcript || savedTeaching.description,
      author: savedTeaching.speaker?.name || "Pastor",
      scripture: savedTeaching.scripture?.reference,
      category: savedTeaching.tags?.[0] || "sermon",
      tags: savedTeaching.tags || [],
      thumbnailUrl: savedTeaching.featuredImage,
      videoUrl: savedTeaching.videoFile?.path,
      youtubeUrl: savedTeaching.youtubeUrl,
      youtubeVideoId: savedTeaching.youtubeVideoId,
      isPublished: savedTeaching.isPublished,
      publishDate: savedTeaching.publishDate,
      createdAt: savedTeaching.createdAt,
      updatedAt: savedTeaching.updatedAt,
    };

    res.status(201).json({
      success: true,
      message: "Teaching created successfully",
      data: transformedTeaching,
    });
  } catch (error) {
    console.error("Error creating teaching:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create teaching",
      error: error.message,
    });
  }
});

// PUT update teaching (Admin only)
router.put("/:id", authenticateAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      content,
      author, // Simple flat field from frontend
      scripture,
      category,
      tags,
      thumbnailUrl,
      imageUrl, // For uploaded images
      videoUrl,
      youtubeUrl,
      youtubeVideoId,
      isPublished,
      publishDate,
      series,
      status,
    } = req.body;

    console.log("📝 Update request received:", {
      title,
      author,
      thumbnailUrl,
      imageUrl,
      youtubeUrl,
      youtubeVideoId,
      category,
    });

    const teaching = await Teaching.findById(req.params.id);
    if (!teaching) {
      return res.status(404).json({
        success: false,
        message: "Teaching not found",
      });
    }

    // Helper function to extract YouTube video ID from URL
    const extractYouTubeId = (url) => {
      if (!url) return null;
      const regex =
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = regex.exec(url);
      return match ? match[1] : null;
    };

    // Process YouTube video data
    let processedYouTubeId = youtubeVideoId;
    let processedYouTubeUrl = youtubeUrl;

    if (youtubeUrl && !youtubeVideoId) {
      processedYouTubeId = extractYouTubeId(youtubeUrl);
    }

    if (youtubeVideoId && !youtubeUrl) {
      processedYouTubeUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
    }

    // Generate YouTube thumbnail if not provided and we have video ID
    let finalThumbnailUrl = thumbnailUrl;
    if (processedYouTubeId && !thumbnailUrl) {
      finalThumbnailUrl = `https://img.youtube.com/vi/${processedYouTubeId}/maxresdefault.jpg`;
    }

    // Update teaching data - transform simple frontend fields to backend structure
    const updateData = {
      title: title || teaching.title,
      description: description || teaching.description,
      speaker: {
        name: author || teaching.speaker?.name || "Pastor", // Transform author to speaker.name
        profilePicture: teaching.speaker?.profilePicture || null,
      },
      featuredImage:
        imageUrl || thumbnailUrl || finalThumbnailUrl || teaching.featuredImage,
      tags: Array.isArray(tags)
        ? tags
        : category
        ? [category.toLowerCase()]
        : teaching.tags || [],
      scripture: {
        reference: scripture || teaching.scripture?.reference || null,
        text: teaching.scripture?.text || null,
      },
      transcript: content || teaching.transcript,
      isPublished:
        isPublished !== undefined ? isPublished : teaching.isPublished,
      publishDate: publishDate ? new Date(publishDate) : teaching.publishDate,
      // YouTube fields
      youtubeVideoId: processedYouTubeId || teaching.youtubeVideoId,
      youtubeUrl: processedYouTubeUrl || teaching.youtubeUrl,
      videoThumbnailUrl: finalThumbnailUrl || teaching.videoThumbnailUrl,
      videoFormat: processedYouTubeId
        ? "youtube"
        : videoUrl
        ? "mp4"
        : teaching.videoFormat,
    };

    // Update video file if provided
    if (videoUrl && !processedYouTubeId) {
      updateData.videoFile = {
        ...teaching.videoFile,
        path: videoUrl,
        originalName: `${title || teaching.title}.mp4`,
        filename: videoUrl.split("/").pop(),
        format: videoUrl.includes("youtube") ? "youtube" : "mp4",
        thumbnail: finalThumbnailUrl,
      };
    }

    // Update series if provided
    if (series) {
      updateData.series = {
        ...teaching.series,
        name: series,
      };
    }

    // Set publish date if status changed to published
    if (status === "published" && !teaching.isPublished) {
      updateData.publishDate = new Date();
    }

    console.log("💾 Updating teaching with data:", updateData);

    const updatedTeaching = await Teaching.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    console.log("✅ Teaching updated successfully:", updatedTeaching._id);

    // Transform response to simple frontend format
    const transformedTeaching = {
      id: updatedTeaching._id,
      title: updatedTeaching.title,
      description: updatedTeaching.description,
      content: updatedTeaching.transcript || "",
      author: updatedTeaching.speaker?.name || "Pastor", // Transform back to simple author field
      scripture: updatedTeaching.scripture?.reference,
      category: updatedTeaching.tags?.[0] || "sermon",
      tags: updatedTeaching.tags || [],
      thumbnailUrl: updatedTeaching.featuredImage,
      videoUrl: updatedTeaching.videoFile?.path,
      audioUrl: updatedTeaching.audioFile?.path,
      youtubeUrl: updatedTeaching.youtubeUrl,
      youtubeVideoId: updatedTeaching.youtubeVideoId,
      isPublished: updatedTeaching.isPublished,
      publishDate: updatedTeaching.publishDate,
      createdAt: updatedTeaching.createdAt,
      updatedAt: updatedTeaching.updatedAt,
    };

    res.json({
      success: true,
      message: "Teaching updated successfully",
      data: transformedTeaching,
    });
  } catch (error) {
    console.error("Error updating teaching:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update teaching",
      error: error.message,
    });
  }
});

// DELETE teaching (Admin only)
router.delete("/:id", authenticateAdmin, async (req, res) => {
  try {
    const teaching = await Teaching.findById(req.params.id);
    if (!teaching) {
      return res.status(404).json({
        success: false,
        message: "Teaching not found",
      });
    }

    await Teaching.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Teaching deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting teaching:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete teaching",
      error: error.message,
    });
  }
});

// PATCH publish teaching (Admin only)
router.patch("/:id/publish", authenticateAdmin, async (req, res) => {
  try {
    const teaching = await Teaching.findById(req.params.id);
    if (!teaching) {
      return res.status(404).json({
        success: false,
        message: "Teaching not found",
      });
    }

    teaching.isPublished = true;
    teaching.publishDate = new Date();
    await teaching.save();

    // Transform response
    const transformedTeaching = {
      id: teaching._id,
      title: teaching.title,
      description: teaching.description,
      speaker: teaching.speaker.name,
      speakerImage: teaching.speaker.profilePicture,
      audioUrl: teaching.audioFile?.path || "",
      videoUrl: teaching.videoFile?.path || "",
      youtubeVideoId: teaching.youtubeVideoId || "",
      youtubeUrl: teaching.youtubeUrl || "",
      videoThumbnailUrl: teaching.videoThumbnailUrl || "",
      duration: formatDuration(teaching.audioFile?.duration || 0),
      image: teaching.featuredImage || "/placeholder-sermon.jpg",
      category: teaching.tags?.[0] || "Sermon",
      series: teaching.series?.name || "",
      scripture: teaching.scripture?.reference || "",
      publishDate: teaching.publishDate || teaching.createdAt,
      status: teaching.isPublished ? "published" : "draft",
      playCount: teaching.playCount || 0,
      downloadCount: teaching.downloadCount || 0,
      likes: teaching.likes?.length || 0,
      comments: teaching.comments?.length || 0,
    };

    res.json({
      success: true,
      message: "Teaching published successfully",
      data: transformedTeaching,
    });
  } catch (error) {
    console.error("Error publishing teaching:", error);
    res.status(500).json({
      success: false,
      message: "Failed to publish teaching",
      error: error.message,
    });
  }
});

// PATCH unpublish teaching (Admin only)
router.patch("/:id/unpublish", authenticateAdmin, async (req, res) => {
  try {
    const teaching = await Teaching.findById(req.params.id);
    if (!teaching) {
      return res.status(404).json({
        success: false,
        message: "Teaching not found",
      });
    }

    teaching.isPublished = false;
    teaching.publishDate = null;
    await teaching.save();

    // Transform response
    const transformedTeaching = {
      id: teaching._id,
      title: teaching.title,
      description: teaching.description,
      speaker: teaching.speaker.name,
      speakerImage: teaching.speaker.profilePicture,
      audioUrl: teaching.audioFile?.path || "",
      videoUrl: teaching.videoFile?.path || "",
      youtubeVideoId: teaching.youtubeVideoId || "",
      youtubeUrl: teaching.youtubeUrl || "",
      videoThumbnailUrl: teaching.videoThumbnailUrl || "",
      duration: formatDuration(teaching.audioFile?.duration || 0),
      image: teaching.featuredImage || "/placeholder-sermon.jpg",
      category: teaching.tags?.[0] || "Sermon",
      series: teaching.series?.name || "",
      scripture: teaching.scripture?.reference || "",
      publishDate: teaching.publishDate || teaching.createdAt,
      status: teaching.isPublished ? "published" : "draft",
      playCount: teaching.playCount || 0,
      downloadCount: teaching.downloadCount || 0,
      likes: teaching.likes?.length || 0,
      comments: teaching.comments?.length || 0,
    };

    res.json({
      success: true,
      message: "Teaching unpublished successfully",
      data: transformedTeaching,
    });
  } catch (error) {
    console.error("Error unpublishing teaching:", error);
    res.status(500).json({
      success: false,
      message: "Failed to unpublish teaching",
      error: error.message,
    });
  }
});

// Helper function to format duration from seconds to readable format
function formatDuration(seconds) {
  if (!seconds || seconds === 0) return "0:00";

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }
}

module.exports = router;
