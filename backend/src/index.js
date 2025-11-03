// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const path = require("path");

// Routes
const classRoutes = require("./routes/classes");
const examRoutes = require("./routes/examRoutes");
const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/student");

dotenv.config();

const app = express();
const server = http.createServer(app);

// ===== SOCKET.IO SETUP =====
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  },
});

// ===== MIDDLEWARES =====
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/public", express.static(path.join(__dirname, "public")));

// ===== ROUTES =====
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/class", classRoutes);
app.use("/api/exams", examRoutes);


// ===== SOCKET.IO EVENTS =====
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  let currentRoom = null;
  let userInfo = {}; // { id, name, isTeacher }

  // User joins a room
  socket.on("join-room", ({ roomId, userName = "Student", isTeacher = false }) => {
    currentRoom = roomId;
    userInfo = { id: socket.id, name: userName, isTeacher };
    socket.join(roomId);
    socket.userInfo = userInfo;

    // Send existing participants to the new user
    const others = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
      .filter(sid => sid !== socket.id)
      .map(sid => io.sockets.sockets.get(sid)?.userInfo || { id: sid, name: "Student", isTeacher: false });

    socket.emit("room-participants", others);

    // Notify others that a new peer joined
    socket.to(roomId).emit("peer-joined", userInfo);

    console.log(`${userName} (${socket.id}) joined room ${roomId}`);
  });

  // WebRTC signaling
  ["offer", "answer", "ice-candidate"].forEach(event => {
    socket.on(event, (data) => {
      if (data.target) {
        io.to(data.target).emit(event, { ...data, from: socket.id });
      }
    });
  });

  // In-room chat
  socket.on("send-message", ({ roomId, message }) => {
    io.to(roomId).emit("receive-message", { id: socket.id, name: userInfo.name, message });
  });

  // ✅ ADD PROCTORING ALERTS
  socket.on("proctoring-alert", ({ roomId, studentId, studentName, alert, timestamp }) => {
    console.log(`🚨 Proctoring Alert from ${studentName}: ${alert}`);
    // Send alert to teacher only
    socket.to(roomId).emit("proctoring-alert", { 
      studentId, 
      studentName, 
      alert, 
      timestamp 
    });
  });

  // ✅ ADD MEDIA STATUS UPDATES
  socket.on("media-status", ({ roomId, camOn, micOn }) => {
    socket.to(roomId).emit("media-status-update", {
      userId: socket.id,
      name: userInfo.name,
      camOn,
      micOn,
      isTeacher: userInfo.isTeacher
    });
  });

  // Disconnect
  socket.on("disconnect", () => {
    if (currentRoom) {
      socket.to(currentRoom).emit("peer-left", socket.id);
      console.log(`${userInfo.name} (${socket.id}) left room ${currentRoom}`);
    }
  });
});

// ===== MONGODB & START SERVER =====
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("✅ MongoDB connected");
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
  })
  .catch((err) => console.error("❌ DB connection error:", err));
