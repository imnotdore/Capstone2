// routes/classwork.js - FULLY UPDATED VERSION WITH EXAM MERGE
const express = require("express");
const router = express.Router();
const Class = require("../models/Class");
const Assignment = require("../models/Assignment");
const Exam = require("../models/Exam"); // ✅ added once at the top
const authMiddleware = require("../middleware/authMiddleware");
const { checkClassAccess, checkTeacherAccess } = require("../middleware/classAuth");


// ✅ GET classwork for a class (Merged with Exams/Quizzes)
router.get("/:classId", authMiddleware, checkClassAccess, async (req, res) => {
  try {
    // Get regular classwork
    const classData = await Class.findById(req.params.classId)
      .populate({
        path: "classwork",
        populate: { path: "createdBy", select: "name email" }
      });

    // Get exams/quizzes
    const exams = await Exam.find({
      classId: req.params.classId
    }).populate("createdBy", "name email");

    // Combine classwork + exams/quizzes
    const combinedClasswork = [
      ...(classData.classwork || []),
      ...exams.map(exam => ({
        ...exam.toObject(),
        type: "quiz",         // force type = quiz
        isPublished: exam.isDeployed || false
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      data: combinedClasswork
    });
  } catch (err) {
    console.error("❌ Get classwork error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch classwork",
      data: []
    });
  }
});


// ✅ CREATE classwork - NEW ENDPOINT
router.post("/create", authMiddleware, checkTeacherAccess, async (req, res) => {
  try {
    const { title, description, type, classId, points, dueDate } = req.body;

    console.log("📝 Creating classwork:", { title, type, classId });

    // Validate required fields
    if (!title || !type || !classId) {
      return res.status(400).json({
        success: false,
        message: "Title, type, and classId are required"
      });
    }

    // Create new classwork
    const newClasswork = new Assignment({
      title,
      description,
      type,
      classId,
      createdBy: req.user.id,
      points: points ? parseInt(points) : 0,
      dueDate: dueDate || null,
      isPublished: true
    });

    const savedClasswork = await newClasswork.save();

    // Add to class.classwork array
    await Class.findByIdAndUpdate(
      classId,
      { $push: { classwork: savedClasswork._id } }
    );

    // Populate createdBy
    await savedClasswork.populate("createdBy", "name email");

    // ✅ Send notifications to class about the new assignment
    const notificationService = require('../services/notificationService');
    await notificationService.notifyClassAboutAssignment(
      classId,
      savedClasswork,
      req.user.id
    );

    console.log("✅ Classwork created successfully:", savedClasswork._id);

    res.json({
      success: true,
      message: "Classwork created successfully",
      data: savedClasswork
    });
  } catch (err) {
    console.error("❌ Classwork creation error:", err);
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


// ✅ GET topics for class
router.get("/:classId/topics", authMiddleware, checkClassAccess, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.classId);
    res.json({
      success: true,
      data: classData.topics || []
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


module.exports = router;