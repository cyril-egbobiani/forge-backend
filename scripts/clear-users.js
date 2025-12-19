const mongoose = require("mongoose");
const User = require("../models/User");
require("dotenv").config();

async function clearAllUsers() {
  try {
    // Connect to MongoDB
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/forge-church"
    );
    console.log("✅ Connected to MongoDB");

    // Get count of users before deletion
    const userCount = await User.countDocuments();
    console.log(`\n📊 Found ${userCount} user(s) in database`);

    if (userCount === 0) {
      console.log("✅ Database is already clean (no users found)");
    } else {
      // List users before deletion
      const users = await User.find({}).select("name email role");
      console.log("\n📋 Users to be deleted:");
      users.forEach((user, index) => {
        console.log(
          `   ${index + 1}. ${user.name} (${user.email}) - ${user.role}`
        );
      });

      // Delete all users
      console.log("\n🗑️  Deleting all users...");
      const result = await User.deleteMany({});
      console.log(`✅ Deleted ${result.deletedCount} user(s)`);
    }

    console.log("\n✅ User cleanup complete");
    console.log(
      '💡 Tip: Run "node scripts/create-admin.js" to create a fresh admin user'
    );
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Warning message
console.log(
  "⚠️  WARNING: This script will delete ALL users from the database!"
);
console.log("⚠️  This action cannot be undone!");
console.log("\n🔄 Starting user deletion in 3 seconds...");

// Add a small delay to allow user to cancel if needed
setTimeout(() => {
  clearAllUsers();
}, 3000);
