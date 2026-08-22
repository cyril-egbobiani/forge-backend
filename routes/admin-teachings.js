const express = require("express");
const router = express.Router();
const Teaching = require("../models/Teaching");
const { authenticateAdmin } = require("../middleware/auth");
const aiService = require("../services/aiService");

// POST preview AI Insights & Key Moments without saving (Admin only)
router.post("/generate-ai", authenticateAdmin, async (req, res) => {
  try {
    const { title, description, content, author, scripture, youtubeUrl, youtubeVideoId } = req.body;
    const insights = await aiService.generateTeachingInsights({
      title: title || "Sermon Teaching",
      description: description || "",
      speaker: author || "Pastor",
      scripture: scripture || "",
      transcript: content || "",
      youtubeUrl,
      youtubeVideoId,
    });
    res.json({
      success: true,
      data: insights,
    });
  } catch (error) {
    console.error("AI Generation Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate AI insights",
      error: error.message,
    });
  }
});

// POST generate & save AI Insights for existing teaching (Admin only)
router.post("/:id/generate-ai", authenticateAdmin, async (req, res) => {
  try {
    const teaching = await Teaching.findById(req.params.id);
    if (!teaching) {
      return res.status(404).json({
        success: false,
        message: "Teaching not found",
      });
    }

    const insights = await aiService.generateTeachingInsights({
      title: teaching.title,
      description: teaching.description,
      speaker: teaching.speaker?.name || "Pastor",
      scripture: teaching.scripture?.reference || "",
      transcript: teaching.transcript || "",
      youtubeUrl: teaching.youtubeUrl,
      youtubeVideoId: teaching.youtubeVideoId,
    });

    teaching.aiInsights = insights.aiInsights;
    teaching.keyMoments = insights.keyMoments;
    await teaching.save();

    res.json({
      success: true,
      message: "AI Insights generated and saved successfully",
      data: {
        aiInsights: teaching.aiInsights,
        keyMoments: teaching.keyMoments,
      },
    });
  } catch (error) {
    console.error("AI Generation & Save Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate and save AI insights",
      error: error.message,
    });
  }
});

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

    const transformedTeachings = teachings.map((teaching) => ({
      id: teaching._id,
      title: teaching.title,
      description: teaching.description,
      content: teaching.transcript || teaching.description,
      author: teaching.speaker?.name || "Pastor",
      scripture: teaching.scripture?.reference,
      category: teaching.tags?.[0] || "sermon",
      tags: teaching.tags || [],
      thumbnailUrl: (
        teaching.youtubeVideoId
          ? `https://img.youtube.com/vi/${teaching.youtubeVideoId}/hqdefault.jpg`
          : (teaching.featuredImage || teaching.videoThumbnailUrl || "")
      ).replace(/http:\/\/localhost:5000/g, "http://localhost:3000"),
      videoUrl: teaching.videoFile?.path,
      audioUrl: teaching.audioFile?.path,
      youtubeUrl: teaching.youtubeUrl,
      youtubeVideoId: teaching.youtubeVideoId,
      aiInsights: teaching.aiInsights,
      keyMoments: teaching.keyMoments || [],
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

    const transformedTeaching = {
      id: teaching._id,
      title: teaching.title,
      description: teaching.description,
      content: teaching.transcript || teaching.description,
      author: teaching.speaker?.name || "Pastor",
      scripture: teaching.scripture?.reference || "",
      category: teaching.tags?.[0] || "sermon",
      tags: teaching.tags || [],
      thumbnailUrl: teaching.featuredImage || teaching.videoThumbnailUrl || "",
      videoUrl: teaching.videoFile?.path || teaching.youtubeUrl || "",
      audioUrl: teaching.audioFile?.path || "",
      youtubeUrl: teaching.youtubeUrl || "",
      youtubeVideoId: teaching.youtubeVideoId || "",
      aiInsights: teaching.aiInsights,
      keyMoments: teaching.keyMoments || [],
      isPublished: teaching.isPublished || false,
      publishDate: teaching.publishDate || teaching.createdAt,
      createdAt: teaching.createdAt,
      updatedAt: teaching.updatedAt,
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
      author,
      scripture,
      category,
      tags,
      thumbnailUrl,
      videoUrl,
      youtubeUrl,
      youtubeVideoId,
      aiInsights,
      keyMoments,
      isPublished,
      publishDate,
    } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required",
      });
    }

    const extractYouTubeId = (url) => {
      if (!url) return null;
      const regex =
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = regex.exec(url);
      return match ? match[1] : null;
    };

    let processedYouTubeId = youtubeVideoId;
    let processedYouTubeUrl = youtubeUrl;

    if (youtubeUrl) {
      const extracted = extractYouTubeId(youtubeUrl);
      if (extracted) {
        processedYouTubeId = extracted;
      }
    } else if (youtubeVideoId && !youtubeUrl) {
      processedYouTubeUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
    }

    let processedThumbnail = thumbnailUrl;
    if (processedYouTubeId && !thumbnailUrl) {
      processedThumbnail = `https://img.youtube.com/vi/${processedYouTubeId}/maxresdefault.jpg`;
    }

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
      aiInsights: aiInsights || undefined,
      keyMoments: Array.isArray(keyMoments) ? keyMoments : [],
      isPublished: isPublished || false,
      publishDate: isPublished
        ? publishDate
          ? new Date(publishDate)
          : new Date()
        : null,
    };

    const newTeaching = new Teaching(teachingData);
    const savedTeaching = await newTeaching.save();

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
      aiInsights: savedTeaching.aiInsights,
      keyMoments: savedTeaching.keyMoments,
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
      author,
      scripture,
      category,
      tags,
      thumbnailUrl,
      imageUrl,
      videoUrl,
      youtubeUrl,
      youtubeVideoId,
      aiInsights,
      keyMoments,
      isPublished,
      status,
      series,
    } = req.body;

    const teaching = await Teaching.findById(req.params.id);
    if (!teaching) {
      return res.status(404).json({
        success: false,
        message: "Teaching not found",
      });
    }

    const extractYouTubeId = (url) => {
      if (!url) return null;
      const regex =
        /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = regex.exec(url);
      return match ? match[1] : null;
    };

    let processedYouTubeId = youtubeVideoId;
    let processedYouTubeUrl = youtubeUrl;

    if (youtubeUrl) {
      const extracted = extractYouTubeId(youtubeUrl);
      if (extracted) {
        processedYouTubeId = extracted;
      }
    } else if (youtubeVideoId && !youtubeUrl) {
      processedYouTubeUrl = `https://www.youtube.com/watch?v=${youtubeVideoId}`;
    }

    const finalThumbnailUrl = thumbnailUrl || imageUrl || teaching.featuredImage;

    const updateData = {
      title: title || teaching.title,
      description: description || teaching.description,
      transcript: content !== undefined ? content : teaching.transcript,
      speaker: {
        name: author || teaching.speaker?.name || "Pastor",
        profilePicture: teaching.speaker?.profilePicture || null,
      },
      featuredImage: finalThumbnailUrl,
      tags: Array.isArray(tags)
        ? tags.map((t) => t.toLowerCase())
        : category
        ? [category.toLowerCase()]
        : teaching.tags,
      scripture: {
        reference: scripture !== undefined ? scripture : teaching.scripture?.reference,
        text: teaching.scripture?.text || "",
      },
      aiInsights: aiInsights !== undefined ? aiInsights : teaching.aiInsights,
      keyMoments: Array.isArray(keyMoments) ? keyMoments : teaching.keyMoments,
      isPublished: status === "published" || isPublished === true,
      youtubeVideoId: processedYouTubeId || teaching.youtubeVideoId,
      youtubeUrl: processedYouTubeUrl || teaching.youtubeUrl,
      videoThumbnailUrl: finalThumbnailUrl || teaching.videoThumbnailUrl,
      videoFormat: processedYouTubeId
        ? "youtube"
        : videoUrl
        ? "mp4"
        : teaching.videoFormat,
    };

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

    if (series) {
      updateData.series = {
        ...teaching.series,
        name: series,
      };
    }

    if (status === "published" && !teaching.isPublished) {
      updateData.publishDate = new Date();
    }

    const updatedTeaching = await Teaching.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    const transformedTeaching = {
      id: updatedTeaching._id,
      title: updatedTeaching.title,
      description: updatedTeaching.description,
      content: updatedTeaching.transcript || "",
      author: updatedTeaching.speaker?.name || "Pastor",
      scripture: updatedTeaching.scripture?.reference,
      category: updatedTeaching.tags?.[0] || "sermon",
      tags: updatedTeaching.tags || [],
      thumbnailUrl: updatedTeaching.featuredImage,
      videoUrl: updatedTeaching.videoFile?.path,
      audioUrl: updatedTeaching.audioFile?.path,
      youtubeUrl: updatedTeaching.youtubeUrl,
      youtubeVideoId: updatedTeaching.youtubeVideoId,
      aiInsights: updatedTeaching.aiInsights,
      keyMoments: updatedTeaching.keyMoments,
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

    res.json({
      success: true,
      message: "Teaching published successfully",
      data: teaching,
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

    res.json({
      success: true,
      message: "Teaching unpublished successfully",
      data: teaching,
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

module.exports = router;
