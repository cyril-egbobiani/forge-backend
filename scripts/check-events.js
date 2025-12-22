const mongoose = require("mongoose");
require("dotenv").config();

const Event = require("../models/Event");

const checkEvents = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/forge-church"
    );

    console.log("🔍 Checking all events in database...");
    const allEvents = await Event.find({});

    console.log(`📊 Total events in database: ${allEvents.length}`);

    allEvents.forEach((event, index) => {
      console.log(`\n📝 Event ${index + 1}:`);
      console.log(`  Title: ${event.title}`);
      console.log(`  Status: ${event.status}`);
      console.log(`  Start Date: ${event.startDate}`);
      console.log(`  Created: ${event.createdAt}`);
    });

    const activeEvents = await Event.find({ status: "active" });
    console.log(`\n✅ Active events: ${activeEvents.length}`);

    const draftEvents = await Event.find({ status: "draft" });
    console.log(`📝 Draft events: ${draftEvents.length}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error checking events:", error);
    process.exit(1);
  }
};

checkEvents();
