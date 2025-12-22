const express = require("express");
const router = express.Router();
const Event = require("../models/Event");
const { authenticateToken } = require("../middleware/auth");

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Authorization error",
    });
  }
};

// Get all events
router.get("/", async (req, res) => {
  try {
    const events = await Event.find()
      .populate("organizer", "name email")
      .sort({ startDate: -1 });

    // Transform events to match frontend interface
    const transformedEvents = events.map((event) => ({
      id: event._id,
      title: event.title,
      description: event.description,
      date: event.startDate.toISOString().split("T")[0],
      time: event.startDate.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      }),
      location: event.location?.venue || event.location?.address || "TBA",
      imageUrl: event.featuredImage,
      category: event.category === "worship" ? "service" : event.category,
      isActive: event.status === "active",
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    }));

    res.json({
      success: true,
      data: transformedEvents,
    });
  } catch (error) {
    console.error("Get events error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching events",
    });
  }
});

// Get single event
router.get("/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate(
      "organizer",
      "name email"
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Transform event to match frontend interface
    const transformedEvent = {
      id: event._id,
      title: event.title,
      description: event.description,
      date: event.startDate.toISOString().split("T")[0],
      time: event.startDate.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      }),
      location: event.location?.venue || event.location?.address || "TBA",
      imageUrl: event.featuredImage,
      category: event.category === "worship" ? "service" : event.category,
      isActive: event.status === "active",
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };

    res.json({
      success: true,
      data: transformedEvent,
    });
  } catch (error) {
    console.error("Get event error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching event",
    });
  }
});

// Create new event (Admin only)
router.post("/", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      time,
      location,
      category,
      isActive,
      imageUrl,
    } = req.body;

    console.log("📝 Creating event with data:", {
      title,
      description,
      date,
      time,
      location,
      category,
      isActive,
      imageUrl,
    });

    // Validation
    if (!title || !description || !date || !time || !location) {
      return res.status(400).json({
        success: false,
        message: "Title, description, date, time, and location are required",
      });
    }

    // Combine date and time
    const startDate = new Date(`${date}T${time}:00.000Z`);
    const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours

    // Create new event
    const newEvent = new Event({
      title: title.trim(),
      description: description.trim(),
      startDate,
      endDate,
      location: {
        venue: location.trim(),
      },
      category: category === "service" ? "worship" : category,
      organizer: req.user.id,
      featuredImage: imageUrl,
      status: isActive ? "active" : "draft",
      attendees: [],
      tags: [],
    });

    await newEvent.save();
    await newEvent.populate("organizer", "name email");

    // Transform response
    const transformedEvent = {
      id: newEvent._id,
      title: newEvent.title,
      description: newEvent.description,
      date: newEvent.startDate.toISOString().split("T")[0],
      time: newEvent.startDate.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      }),
      location: newEvent.location?.venue || "TBA",
      imageUrl: newEvent.featuredImage,
      category: newEvent.category === "worship" ? "service" : newEvent.category,
      isActive: newEvent.status === "active",
      createdAt: newEvent.createdAt,
      updatedAt: newEvent.updatedAt,
    };

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: transformedEvent,
    });
  } catch (error) {
    console.error("Create event error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating event",
    });
  }
});

// Update event (Admin only)
router.put("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      time,
      location,
      category,
      isActive,
      imageUrl,
    } = req.body;

    console.log("📝 Updating event with data:", {
      title,
      description,
      date,
      time,
      location,
      category,
      isActive: isActive,
      isActiveType: typeof isActive,
      imageUrl,
    });

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Update fields
    if (title) event.title = title.trim();
    if (description) event.description = description.trim();
    if (date && time) {
      event.startDate = new Date(`${date}T${time}:00.000Z`);
      event.endDate = new Date(event.startDate.getTime() + 2 * 60 * 60 * 1000);
    }
    if (location) event.location.venue = location.trim();
    if (category)
      event.category = category === "service" ? "worship" : category;
    if (typeof isActive === "boolean")
      event.status = isActive ? "active" : "draft";
    if (imageUrl !== undefined) event.featuredImage = imageUrl;

    await event.save();
    await event.populate("organizer", "name email");

    // Transform response
    const transformedEvent = {
      id: event._id,
      title: event.title,
      description: event.description,
      date: event.startDate.toISOString().split("T")[0],
      time: event.startDate.toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
      }),
      location: event.location?.venue || "TBA",
      imageUrl: event.featuredImage,
      category: event.category === "worship" ? "service" : event.category,
      isActive: event.status === "active",
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };

    res.json({
      success: true,
      message: "Event updated successfully",
      data: transformedEvent,
    });
  } catch (error) {
    console.error("Update event error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating event",
    });
  }
});

// Delete event (Admin only)
router.delete("/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Delete event error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting event",
    });
  }
});

module.exports = router;
