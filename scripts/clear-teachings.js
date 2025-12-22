const mongoose = require("mongoose");
require("dotenv").config();

const Teaching = require("../models/Teaching");

const clearTeachings = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/forge-church"
    );

    console.log("🗑️ Clearing all teachings...");
    const result = await Teaching.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} teachings`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing teachings:", error);
    process.exit(1);
  }
};

clearTeachings();
