const mongoose = require("mongoose");
require("dotenv").config();

const Event = require("../models/Event");

const fixEventStatuses = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/forge-church"
    );

    console.log("🔧 Fixing event statuses...");

    // Find all events with undefined status
    const eventsWithoutStatus = await Event.find({
      $or: [
        { status: { $exists: false } },
        { status: null },
        { status: undefined },
      ],
    });

    console.log(
      `📊 Found ${eventsWithoutStatus.length} events without proper status`
    );

    for (const event of eventsWithoutStatus) {
      // Set to active by default (since they were created, assume they should be visible)
      event.status = "active";
      await event.save();
      console.log(`✅ Updated "${event.title}" status to "active"`);
    }

    console.log("\n🔍 Final status check:");
    const allEvents = await Event.find({});
    allEvents.forEach((event, index) => {
      console.log(`  ${index + 1}. "${event.title}" - Status: ${event.status}`);
    });

    const activeEvents = await Event.find({ status: "active" });
    console.log(`\n✅ Total active events: ${activeEvents.length}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error fixing event statuses:", error);
    process.exit(1);
  }
};

fixEventStatuses();
