const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const http = require("http");
const socketIo = require("socket.io");

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173", 
    "https://forge-web-ivory.vercel.app",
    "*" // Keep wildcard for development
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(
    `📨 ${req.method} ${req.path} - ${new Date().toLocaleTimeString()}`
  );
  if (req.body && Object.keys(req.body).length > 0) {
    console.log("📦 Request body:", req.body);
  }
  next();
});

// Serve static files (for audio uploads)
app.use("/uploads", express.static("uploads"));

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "Forge Church App Backend API",
    version: "1.0.0",
    status: "running",
  });
});

// Make io available to routes
app.set("io", io);

// API Routes
app.use("/api/chat", require("./routes/chat"));
app.use("/api/badges", require("./routes/badges"));
app.use("/api", require("./routes/api"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/teachings", require("./routes/teachings"));
app.use("/api/prayers", require("./routes/prayerRequests"));
app.use("/api/game-sessions", require("./routes/gameSessions"));
app.use("/api/events", require("./routes/public-events"));

// Admin API Routes
app.use("/api/admin/auth", require("./routes/admin-auth"));
app.use("/api/admin/events", require("./routes/events"));
app.use("/api/admin/teachings", require("./routes/admin-teachings"));
app.use("/api/admin/uploads", require("./routes/uploads"));

// Socket.IO for real-time chat
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join chat room (group or private)
  socket.on("join-chat-room", (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined chat room: ${roomId}`);
  });

  // Send chat message
  socket.on("send-chat-message", async (data) => {
    // data: { roomId, senderId, senderName, content }
    io.to(data.roomId).emit("new-chat-message", data);
    // Optionally save to DB
    try {
      const ChatMessage = require("./models/ChatMessage");
      await ChatMessage.create({
        roomId: data.roomId,
        senderId: data.senderId,
        senderName: data.senderName,
        content: data.content,
      });
    } catch (err) {
      console.error("Error saving chat message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Database connection
const connectDB = async () => {
  try {
    // We'll use MongoDB Atlas free tier
    const conn = await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/forge-church"
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, async () => {
  await connectDB();
  console.log(`🚀 Forge Church Backend Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready for real-time communication`);
});

module.exports = { app, io };
