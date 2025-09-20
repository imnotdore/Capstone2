const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
const path = require("path");

// Routes
const classRoutes = require("./routes/classes");
const examRoutes = require("./routes/exam");
const authRoutes = require("./routes/auth");
const studentRoutes = require("./routes/student");

dotenv.config();

const app = express();

// ===== MIDDLEWARES =====

// Dynamic CORS: allow any localhost port in dev
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests from localhost on any port or no origin (Postman)
      if (!origin || origin.startsWith("http://localhost")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true, // allow cookies / JWT
  })
);

app.use(express.json());
app.use(cookieParser());

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===== ROUTES =====
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/class", classRoutes);
app.use("/api/exams", examRoutes);

// ===== MONGODB CONNECT & START SERVER =====
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(3000, () => console.log("✅ API running at http://localhost:3000"));
  })
  .catch((err) => console.error("❌ DB connection error:", err));
