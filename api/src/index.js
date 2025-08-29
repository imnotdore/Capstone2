const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

dotenv.config();
const app = express();

app.use(cors({ origin: process.env.WEB_ORIGIN, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);
const studentRoutes = require("./routes/student");
app.use("/api/student", studentRoutes);

// MongoDB connect + server start
mongoose.connect(process.env.MONGO_URL)
  .then(() => {
    app.listen(3000, () => console.log("✅ API running at http://localhost:3000"));
  })
  .catch(err => console.error("❌ DB connection error:", err));
