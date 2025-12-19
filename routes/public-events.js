const express = require("express");
const router = express.Router();
const Event = require("../models/Event");

// Get all published events (public endpoint)
router.get("/", async (req, res) => {
  try {
    console.log("📅 Fetching public events...");

    // Find only published events
    const events = await Event.find({
      status: "active",
      // Add any other filters for published events
    })
      .populate("organizer", "name email")
      .sort({ startDate: 1 }); // Sort by start date ascending

    console.log(`Found ${events.length} published events`);

    // Transform events to match mobile app interface
    const transformedEvents = events.map((event) => ({
      id: event._id.toString(),
      title: event.title,
      description: event.description,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate ? event.endDate.toISOString() : null,
      location: event.location?.venue || event.location?.address || null,
      category: event.category || "general",
      tags: event.tags || [],
      isPublished: event.status === "active",
      organizer: event.organizer?.name || "Forge Church",
      currentAttendees: event.attendees?.length || 0,
      maxAttendees: event.maxAttendees || null,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      featuredImage: event.featuredImage || null,
    }));

    res.json({
      success: true,
      data: transformedEvents,
      count: transformedEvents.length,
    });
  } catch (error) {
    console.error("❌ Error fetching public events:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch events",
      error: error.message,
    });
  }
});

// Get single published event by ID (public endpoint)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📅 Fetching event with ID: ${id}`);

    const event = await Event.findOne({
      _id: id,
      status: "active",
    }).populate("organizer", "name email");

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found or not published",
      });
    }

    // Transform event to match mobile app interface
    const transformedEvent = {
      id: event._id.toString(),
      title: event.title,
      description: event.description,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate ? event.endDate.toISOString() : null,
      location: event.location?.venue || event.location?.address || null,
      category: event.category || "general",
      tags: event.tags || [],
      isPublished: event.status === "active",
      organizer: event.organizer?.name || "Forge Church",
      currentAttendees: event.attendees?.length || 0,
      maxAttendees: event.maxAttendees || null,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      featuredImage: event.featuredImage || null,
    };

    res.json({
      success: true,
      data: transformedEvent,
    });
  } catch (error) {
    console.error("❌ Error fetching event:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch event",
      error: error.message,
    });
  }
});

module.exports = router;
