const express = require("express");
const router = express.Router();
const Class = require("../models/class");
const authMiddleware = require("../middleware/authMiddleware");

// Create new class (your existing POST /class)
router.post("/", authMiddleware, async (req, res) => {
  // ... your create class logic
});

// Get only the classes of the logged-in teacher
router.get("/teacher/me", authMiddleware, async (req, res) => {
  try {
    const classes = await Class.find({ teacherId: req.user.id });
    res.json(classes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
