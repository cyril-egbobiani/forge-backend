const mongoose = require("mongoose");
const User = require("../models/User");
require("dotenv").config();

async function listUsers() {
  try {
    // Connect to MongoDB
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/forge-church"
    );
    console.log("✅ Connected to MongoDB");

    // Get all users
    console.log("\n📋 Fetching all users...");
    const users = await User.find({}).select(
      "name email role isActive createdAt lastSeen"
    );

    if (users.length === 0) {
      console.log("❌ No users found in database");
    } else {
      console.log(`\n✅ Found ${users.length} user(s):\n`);

      users.forEach((user, index) => {
        console.log(`${index + 1}. Name: ${user.name}`);
        console.log(`   Email/Username: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Active: ${user.isActive}`);
        console.log(
          `   Created: ${user.createdAt?.toLocaleDateString() || "N/A"}`
        );
        console.log(
          `   Last Seen: ${user.lastSeen?.toLocaleDateString() || "Never"}`
        );
        console.log("   ---");
      });

      // Show admin users specifically
      const adminUsers = users.filter((user) => user.role === "admin");
      if (adminUsers.length > 0) {
        console.log(`\n👑 Admin users (${adminUsers.length}):`);
        adminUsers.forEach((admin) => {
          console.log(
            `   - ${admin.name} (${admin.email}) - Active: ${admin.isActive}`
          );
        });
      } else {
        console.log("\n❌ No admin users found!");
      }
    }

    console.log("\n✅ User listing complete");
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the script
listUsers();
