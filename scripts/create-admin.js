const mongoose = require("mongoose");
const User = require("../models/User");
require("dotenv").config();

// Configuration
const ADMIN_USERNAME = "admin123";
const ADMIN_PASSWORD = "admin123456";
const ADMIN_NAME = "System Admin";

async function createAdminUser() {
  try {
    // Connect to MongoDB
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/forge-church"
    );
    console.log("✅ Connected to MongoDB");

    // Check if admin user already exists
    console.log(`🔍 Checking if admin user '${ADMIN_USERNAME}' exists...`);
    const existingUser = await User.findOne({
      email: ADMIN_USERNAME.toLowerCase(),
    });

    if (existingUser) {
      console.log("❌ Admin user already exists:");
      console.log(`   Name: ${existingUser.name}`);
      console.log(`   Email/Username: ${existingUser.email}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Active: ${existingUser.isActive}`);

      if (existingUser.role !== "admin") {
        console.log("🔧 Updating user role to admin...");
        existingUser.role = "admin";
        await existingUser.save();
        console.log("✅ User role updated to admin");
      }
    } else {
      // Create new admin user
      console.log("🔧 Creating new admin user...");
      const adminUser = new User({
        name: ADMIN_NAME,
        email: ADMIN_USERNAME.toLowerCase(), // Using username as email
        password: ADMIN_PASSWORD, // Will be hashed automatically
        role: "admin",
        isActive: true,
      });

      await adminUser.save();
      console.log("✅ Admin user created successfully!");
      console.log(`   Name: ${ADMIN_NAME}`);
      console.log(`   Username: ${ADMIN_USERNAME}`);
      console.log(`   Password: ${ADMIN_PASSWORD}`);
      console.log(`   Role: admin`);
    }

    console.log("\n✅ Admin user setup complete");
    console.log("🔐 You can now login with:");
    console.log(`   Username: ${ADMIN_USERNAME}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the script
createAdminUser();
