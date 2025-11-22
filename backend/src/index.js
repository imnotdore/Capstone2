// server.js - UPDATED WITHOUT MISSING IMPORT
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const path = require("path");

// ✅ LOAD ENV FIRST
dotenv.config();

// ✅ THEN IMPORT PASSPORT CONFIG
require("./config/passport");

// Routes
const classRoutes = require("./routes/classes");
const examRoutes = require("./routes/examRoutes");
const authRoutes = require("./routes/auth");
const classworkRoutes = require("./routes/classwork");
const announcementRoutes = require("./routes/announcements");
const studentManagementRoutes = require("./routes/studentManagement");
const notificationRoutes = require("./routes/notifications");

// Import Email Service for verification
const EmailService = require("./services/emailService");

const app = express();
const server = http.createServer(app);

// ===== PASSPORT INITIALIZATION =====
const passport = require("passport");
app.use(passport.initialize());

// ===== SOCKET.IO SETUP =====
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  },
});

// ===== MIDDLEWARES =====
app.use(cors({ 
  origin: process.env.FRONTEND_URL || "http://localhost:5173", 
  credentials: true 
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/public", express.static(path.join(__dirname, "public")));

// ===== FIX CSP ERROR =====
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' 'unsafe-inline' http://localhost:3000 http://localhost:5173 https://accounts.google.com; " +
    "connect-src 'self' http://localhost:3000 ws://localhost:3000 http://localhost:5173 https://accounts.google.com; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com; " +
    "style-src 'self' 'unsafe-inline' https://accounts.google.com; " +
    "img-src 'self' data: https:;"
  );
  next();
});

// ===== CLEAN ROUTES - UPDATED =====
app.use("/api/auth", authRoutes);
app.use("/api/class", classRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/classwork", classworkRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/student-management", studentManagementRoutes);
app.use("/api/notifications", notificationRoutes);

// ===== HEALTH CHECK =====
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Server is running with Classwork Create system & Student Management",
    googleAuth: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    emailService: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
    classworkCreateEnabled: true,
    announcementsEnabled: true,
    studentManagementEnabled: true,
    notificationsEnabled: true,
    timestamp: new Date().toISOString()
  });
});

// ===== SOCKET.IO EVENTS =====
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  let currentRoom = null;
  let userInfo = {};

  socket.on("join-room", ({ roomId, userName = "User", userId }) => {
    currentRoom = roomId;
    userInfo = { id: socket.id, name: userName, userId };
    socket.join(roomId);
    socket.userInfo = userInfo;

    const others = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
      .filter(sid => sid !== socket.id)
      .map(sid => io.sockets.sockets.get(sid)?.userInfo || { id: sid, name: "User" });

    socket.emit("room-participants", others);
    socket.to(roomId).emit("peer-joined", userInfo);

    console.log(`${userName} (${socket.id}) joined room ${roomId}`);
  });

  ["offer", "answer", "ice-candidate"].forEach(event => {
    socket.on(event, (data) => {
      if (data.target) {
        io.to(data.target).emit(event, { ...data, from: socket.id });
      }
    });
  });

  socket.on("send-message", ({ roomId, message }) => {
    io.to(roomId).emit("receive-message", { id: socket.id, name: userInfo.name, message });
  });

  socket.on("proctoring-alert", ({ roomId, studentId, studentName, alert, timestamp }) => {
    console.log(`🚨 Proctoring Alert from ${studentName}: ${alert}`);
    socket.to(roomId).emit("proctoring-alert", { 
      studentId, 
      studentName, 
      alert, 
      timestamp 
    });
  });

  socket.on("media-status", ({ roomId, camOn, micOn }) => {
    socket.to(roomId).emit("media-status-update", {
      userId: socket.id,
      name: userInfo.name,
      camOn,
      micOn
    });
  });

  socket.on("disconnect", () => {
    if (currentRoom) {
      socket.to(currentRoom).emit("peer-left", socket.id);
      console.log(`${userInfo.name} (${socket.id}) left room ${currentRoom}`);
    }
  });
});

// ===== ERROR HANDLING MIDDLEWARE =====
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ===== FIXED 404 HANDLER =====
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// ===== MONGODB & START SERVER =====
const startServer = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URL);
    console.log("✅ MongoDB connected");

    // Verify email service configuration (non-blocking)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      EmailService.verifyTransporter().then(isReady => {
        if (isReady) {
          console.log('✅ Email service is ready');
        } else {
          console.log('⚠️ Email service configuration issues - emails may not send');
        }
      }).catch(err => {
        console.log('⚠️ Email service verification failed:', err.message);
      });
    } else {
      console.log('⚠️ Email credentials not configured - email notifications disabled');
    }

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      console.log(`✅ Server running at http://localhost:${PORT}`);
      console.log(`✅ Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? 'ENABLED' : 'DISABLED'}`);
      console.log(`✅ Email Service: ${process.env.EMAIL_USER ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
      console.log(`✅ All routes under: /api`);
      console.log(`✅ Auth Routes: /api/auth`);
      console.log(`✅ Class Routes: /api/class`);
      console.log(`✅ Exam Routes: /api/exams`);
      console.log(`✅ Classwork Routes: /api/classwork`);
      console.log(`✅ Announcement Routes: /api/announcements`);
      console.log(`✅ Student Management Routes: /api/student-management`);
      console.log(`✅ Notification Routes: /api/notifications`);
    });
  } catch (err) {
    console.error("❌ Server startup error:", err);
    process.exit(1);
  }
};

// Start the server
startServer();