const express = require("express");
const router = express.Router();
const Class = require("../models/Class");
const authMiddleware = require("../middleware/authMiddleware");

// Get classes joined by student
router.get("/classes", authMiddleware, async (req, res) => {
  try {
    const studentId = req.user.id;
    const classes = await Class.find({ students: studentId });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: "Failed to load classes" });
  }
});

// Join a class
router.post("/join", authMiddleware, async (req, res) => {
  try {
    const { classCode } = req.body;
    const classData = await Class.findOne({ code: classCode });
    if (!classData) return res.status(404).json({ message: "Class not found" });

    if (!classData.students.includes(req.user.id)) {
      classData.students.push(req.user.id);
      await classData.save();
    }

    res.json(classData);
  } catch (err) {
    res.status(500).json({ message: "Failed to join class" });
  }
});

module.exports = router;
