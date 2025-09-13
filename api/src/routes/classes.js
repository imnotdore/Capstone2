const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const Class = require("../models/class");

// Create class
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, code } = req.body;
    const teacherId = req.user.id;

    const newClass = await Class.create({ name, code, teacherId });
    res.json(newClass);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get classes of logged-in teacher
router.get("/teacher/me", authMiddleware, async (req, res) => {
  try {
    const classes = await Class.find({ teacherId: req.user.id });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get students of a class
router.get("/students/:classId", authMiddleware, async (req, res) => {
  try {
    const classId = req.params.classId;
    const classData = await Class.findById(classId).populate("students", "name email");

    if (!classData) return res.status(404).json({ message: "Class not found" });

    res.json(classData.students); // babalik ang array ng students
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch students" });
  }
});


// Join a class
router.post("/join", authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "Code is required" });

    const classData = await Class.findOne({ code });
    if (!classData) return res.status(404).json({ message: "Class not found" });

    // Check if student already joined
    if (classData.students.includes(req.user.id)) {
      return res.status(400).json({ message: "You have already joined this class" });
    }

    // Add student
    classData.students.push(req.user.id);
    await classData.save();

    res.json({ message: "Joined class successfully", class: classData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to join class" });
  }
});

module.exports = router;
