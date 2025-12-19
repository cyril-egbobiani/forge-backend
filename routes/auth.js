const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const router = express.Router();
const User = require("../models/User");
const {
  generateToken,
  generateRefreshToken,
  authenticateToken,
} = require("../middleware/auth");

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Register new user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User with this email already exists",
      });
    }

    // Create new user
    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phoneNumber: phone ? phone.trim() : null,
    });

    await newUser.save();

    // Generate tokens
    const token = generateToken(newUser._id);
    const refreshToken = generateRefreshToken(newUser._id);

    // Return user data without password
    const userData = await User.findById(newUser._id).select("-password");

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: userData,
      token,
      refreshToken,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
    });
  }
});

// Login user
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Update last seen
    user.lastSeen = new Date();
    await user.save();

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Return user data without password
    const userData = await User.findById(user._id).select("-password");

    res.json({
      success: true,
      message: "Login successful",
      user: userData,
      token,
      refreshToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
    });
  }
});

// Google authentication
router.post("/google", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Google ID token is required",
      });
    }

    // Verify Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({
        success: false,
        message: "Invalid Google token",
      });
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!email || !name) {
      return res.status(400).json({
        success: false,
        message: "Required user information not available from Google",
      });
    }

    // Check if user already exists
    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      // User exists - update Google info if needed
      if (!user.googleId) {
        user.googleId = googleId;
        user.profilePicture = picture || user.profilePicture;
        await user.save();
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          message: "Account is deactivated",
        });
      }
    } else {
      // Create new user from Google info
      user = new User({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        googleId,
        profilePicture: picture,
        password: "google_auth_" + Math.random().toString(36), // Random password for Google users
        isActive: true,
      });

      await user.save();
    }

    // Update last seen
    user.lastSeen = new Date();
    await user.save();

    // Generate tokens
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Return user data without password
    const userData = await User.findById(user._id).select("-password");

    res.json({
      success: true,
      message:
        user.googleId === googleId
          ? "Login successful"
          : "Account linked and login successful",
      user: userData,
      token,
      refreshToken,
    });
  } catch (error) {
    console.error("Google authentication error:", error);
    res.status(500).json({
      success: false,
      message: "Google authentication failed",
    });
  }
});

// Refresh token
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token required",
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || "forge-refresh-secret"
    );

    // Find user
    const user = await User.findById(decoded.userId).select("-password");
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User not found or account deactivated",
      });
    }

    // Generate new tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.json({
      success: true,
      message: "Token refreshed successfully",
      token: newToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Token refresh error:", error);

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during token refresh",
    });
  }
});

// Get current user profile
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select("-password")
      .populate("prayerRequests")
      .populate("favoriteTeachings");

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user profile",
    });
  }
});

// Update user profile
router.put("/me", authenticateToken, async (req, res) => {
  try {
    const { name, phoneNumber } = req.body;
    const updateData = {};

    if (name) updateData.name = name.trim();
    if (phoneNumber !== undefined)
      updateData.phoneNumber = phoneNumber ? phoneNumber.trim() : null;

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    res.json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    console.error("Profile update error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating profile",
    });
  }
});

// Change password
router.put("/change-password", authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    // Find user with password
    const user = await User.findById(req.user._id);

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({
      success: false,
      message: "Error changing password",
    });
  }
});

// Logout (token invalidation would require a blacklist implementation)
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    // In a full implementation, you'd add the token to a blacklist
    // For now, we'll just return success
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      message: "Error during logout",
    });
  }
});

// Verify token endpoint
router.get("/verify", authenticateToken, async (req, res) => {
  res.json({
    success: true,
    message: "Token is valid",
    user: req.user,
  });
});

// Admin registration endpoint
router.post("/admin/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Username, email, and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { name: username }],
    });

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "Admin with this email or username already exists",
      });
    }

    // Create new admin user
    const newAdmin = new User({
      name: username.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: "admin",
      isVerified: true, // Auto-verify admins
    });

    await newAdmin.save();

    // Generate tokens
    const token = generateToken(newAdmin._id);
    const refreshToken = generateRefreshToken(newAdmin._id);

    // Update user with refresh token
    newAdmin.refreshToken = refreshToken;
    await newAdmin.save();

    res.status(201).json({
      success: true,
      message: "Admin account created successfully",
      data: {
        token,
        user: {
          id: newAdmin._id,
          username: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role,
          createdAt: newAdmin.createdAt,
          updatedAt: newAdmin.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error("Admin registration error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating admin account",
    });
  }
});

// Admin login endpoint
router.post("/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: "Username and password are required",
      });
    }

    // Find admin by username or email
    const admin = await User.findOne({
      $or: [{ name: username }, { email: username.toLowerCase() }],
      role: "admin",
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid admin credentials",
      });
    }

    // Generate tokens
    const token = generateToken(admin._id);
    const refreshToken = generateRefreshToken(admin._id);

    // Update user with refresh token
    admin.refreshToken = refreshToken;
    admin.lastLogin = new Date();
    await admin.save();

    res.json({
      success: true,
      message: "Admin login successful",
      data: {
        token,
        user: {
          id: admin._id,
          username: admin.name,
          email: admin.email,
          role: admin.role,
          createdAt: admin.createdAt,
          updatedAt: admin.updatedAt,
        },
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Error during admin login",
    });
  }
});

module.exports = router;
