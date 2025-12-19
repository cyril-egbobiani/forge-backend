const mongoose = require("mongoose");
const User = require("../models/User");
require("dotenv").config();

// Configuration - Change these values as needed
const USERNAME_TO_RESET = "admin"; // Change this to the username you want to reset
const NEW_PASSWORD = "newPassword123"; // Change this to your new password

async function resetPassword() {
  try {
    // Connect to MongoDB
    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/forge-church"
    );
    console.log("✅ Connected to MongoDB");

    // Find the user
    console.log(`🔍 Looking for user '${USERNAME_TO_RESET}'...`);
    const user = await User.findOne({
      email: USERNAME_TO_RESET.toLowerCase(),
    });

    if (!user) {
      console.log(`❌ User '${USERNAME_TO_RESET}' not found!`);
      console.log("\n📋 Available users:");
      const allUsers = await User.find({}).select("name email role");
      allUsers.forEach((u, index) => {
        console.log(`   ${index + 1}. ${u.name} (${u.email}) - ${u.role}`);
      });
    } else {
      console.log(`✅ Found user: ${user.name} (${user.email}) - ${user.role}`);

      // Update the password
      console.log("🔧 Updating password...");
      user.password = NEW_PASSWORD; // Will be hashed automatically by the User model
      await user.save();

      console.log("✅ Password updated successfully!");
      console.log("\n🔐 New login credentials:");
      console.log(`   Username: ${USERNAME_TO_RESET}`);
      console.log(`   Password: ${NEW_PASSWORD}`);
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

// Run the script
resetPassword();
