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

// Load env
dotenv.config();

const app = express();

// Middlewares
app.use(cors({ origin: process.env.WEB_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Serve uploaded files (exam PDFs, etc.)
// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));


// Routes
app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/class", classRoutes);
app.use("/api/exams", examRoutes);


// MongoDB connect + start server
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    app.listen(3000, () =>
      console.log("✅ API running at http://localhost:3000")
    );
  })
  .catch((err) => console.error("❌ DB connection error:", err));
