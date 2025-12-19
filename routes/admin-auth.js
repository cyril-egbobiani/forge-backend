const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// Admin Login
router.post("/login", async (req, res) => {
  try {
    console.log("🔍 Login attempt started");
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      console.log("❌ Missing username or password");
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    console.log("🔍 Looking for user with username:", username.toLowerCase());
    // Find user by email (username is stored as email in our case)
    const user = await User.findOne({ email: username.toLowerCase() });
    if (!user) {
      console.log("❌ User not found");
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    console.log("✅ User found:", user.name, "Role:", user.role);
    // Check if user has admin role
    if (user.role !== "admin") {
      console.log("❌ User is not admin, role:", user.role);
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required.",
      });
    }

    console.log("🔍 Verifying password...");
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      console.log("❌ Invalid password");
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    console.log("✅ Password valid, generating token...");
    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || "fallback-secret-key",
      { expiresIn: "24h" }
    );

    console.log("✅ Token generated successfully");

    // Update last seen
    user.lastSeen = new Date();
    await user.save();
    console.log("✅ User last seen updated");

    // Return success response
    console.log("✅ Sending success response...");
    res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture,
        },
      },
    });
    console.log("✅ Response sent successfully");
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Admin Register (for creating admin accounts)
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    // Check if username already exists (stored as email)
    const existingUser = await User.findOne({ email: username.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Username already registered",
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Create new admin user
    const user = new User({
      name: username.trim(),
      email: username.toLowerCase().trim(),
      password, // Will be hashed by the pre-save middleware
      role: "admin", // Set as admin
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET || "fallback-secret-key",
      { expiresIn: "24h" }
    );

    // Return success response
    res.status(201).json({
      success: true,
      message: "Admin account created successfully",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          profilePicture: user.profilePicture,
        },
      },
    });
  } catch (error) {
    console.error("Admin registration error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
});

// Verify admin token
router.get("/verify", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback-secret-key"
    );
    const user = await User.findById(decoded.userId).select("-password");

    if (!user || user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Invalid token or insufficient privileges",
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid token",
      error: error.message,
    });
  }
});

// Admin logout (optional - mainly handled client-side)
router.post("/logout", (req, res) => {
  res.json({
    success: true,
    message: "Logged out successfully",
  });
});

module.exports = router;
