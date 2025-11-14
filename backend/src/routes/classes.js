// routes/classes.js - COMPLETELY UPDATED WITH UNENROLL AND ARCHIVE
const express = require("express");
const router = express.Router();
const Class = require("../models/class");
const authMiddleware = require("../middleware/authMiddleware");
const { checkClassAccess, checkTeacherAccess } = require("../middleware/classAuth");

// ✅ Create class - ANYONE can create
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    const ownerId = req.user.id;

    // Generate unique class code
    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return code;
    };

    let code;
    let existingClass;
    
    // Ensure unique code
    do {
      code = generateCode();
      existingClass = await Class.findOne({ code });
    } while (existingClass);

    const newClass = await Class.create({ 
      name, 
      code, 
      ownerId,
      members: [{ userId: ownerId, role: "teacher" }] // Owner automatically becomes teacher
    });

    res.json({
      success: true,
      message: "Class created successfully",
      data: newClass
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Join class - ANYONE can join
router.post("/join", authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) return res.status(400).json({ message: "Class code is required" });

    const classData = await Class.findOne({ code });
    if (!classData) return res.status(404).json({ message: "Class not found" });

    // Check if already member
    const isMember = classData.members.some(m => m.userId.toString() === userId);
    if (isMember) {
      return res.status(400).json({ message: "You have already joined this class" });
    }

    // Add as student member
    classData.members.push({ userId, role: "student" });
    await classData.save();

    res.json({ 
      success: true,
      message: "Joined class successfully", 
      data: classData 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to join class" });
  }
});

// ✅ Get user's classes (both owned and joined) - EXCLUDE ARCHIVED
router.get("/my-classes", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const classes = await Class.find({
      $or: [
        { ownerId: userId }, // Classes they own
        { "members.userId": userId } // Classes they joined
      ],
      isArchived: false // ✅ Only show non-archived classes
    })
    .populate("ownerId", "name email")
    .populate("members.userId", "name email");

    // Add role context for each class
    const classesWithRole = classes.map(classData => {
      const isOwner = classData.ownerId._id.toString() === userId;
      const member = classData.members.find(m => m.userId._id.toString() === userId);
      
      return {
        ...classData._doc,
        userRole: isOwner ? "teacher" : (member?.role || "student")
      };
    });

    res.json({
      success: true,
      data: classesWithRole
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Get class details with user role
router.get("/:classId", authMiddleware, checkClassAccess, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.classId)
      .populate("ownerId", "name email")
      .populate("members.userId", "name email")
      .populate("exams");

    res.json({
      success: true,
      data: {
        ...classData._doc,
        userRole: req.user.classRole
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Get class members
router.get("/:classId/members", authMiddleware, checkClassAccess, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.classId)
      .populate("ownerId", "name email")
      .populate("members.userId", "name email");

    const members = classData.members.map(member => ({
      ...member.userId._doc,
      role: member.role,
      joinedAt: member.joinedAt
    }));

    // Add owner as teacher
    const ownerAsMember = {
      ...classData.ownerId._doc,
      role: "teacher",
      joinedAt: classData.createdAt
    };

    // Combine owner and members, remove duplicates
    const allMembers = [ownerAsMember, ...members.filter(m => 
      m._id.toString() !== classData.ownerId._id.toString()
    )];

    res.json({
      success: true,
      data: allMembers
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ UNENROLL FROM CLASS - NEW ENDPOINT
router.delete("/:classId/unenroll", authMiddleware, async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user.id;

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Check if user is the owner (teacher can't unenroll from their own class)
    if (classData.ownerId.toString() === userId) {
      return res.status(400).json({ message: "Teachers cannot unenroll from their own class" });
    }

    // Check if user is actually enrolled
    const isEnrolled = classData.members.some(member => member.userId.toString() === userId);
    if (!isEnrolled) {
      return res.status(400).json({ message: "You are not enrolled in this class" });
    }

    // Remove user from members array
    classData.members = classData.members.filter(
      member => member.userId.toString() !== userId
    );

    await classData.save();

    res.json({
      success: true,
      message: "Successfully unenrolled from class"
    });
  } catch (err) {
    console.error("Unenroll error:", err);
    res.status(500).json({ message: "Failed to unenroll from class" });
  }
});

// ✅ ARCHIVE CLASS (Teacher only)
router.put("/:classId/archive", authMiddleware, async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user.id;

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Check if user is the teacher/owner of this class
    if (classData.ownerId.toString() !== userId) {
      return res.status(403).json({ message: "Only the teacher can archive this class" });
    }

    // Archive the class
    classData.isArchived = true;
    classData.archivedAt = new Date();
    await classData.save();

    res.json({
      success: true,
      message: "Class archived successfully",
      data: classData
    });
  } catch (err) {
    console.error("Archive error:", err);
    res.status(500).json({ message: "Failed to archive class" });
  }
});

// ✅ RESTORE CLASS (Teacher only)
router.put("/:classId/restore", authMiddleware, async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user.id;

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Check if user is the teacher/owner of this class
    if (classData.ownerId.toString() !== userId) {
      return res.status(403).json({ message: "Only the teacher can restore this class" });
    }

    // Restore the class
    classData.isArchived = false;
    classData.archivedAt = null;
    await classData.save();

    res.json({
      success: true,
      message: "Class restored successfully",
      data: classData
    });
  } catch (err) {
    console.error("Restore error:", err);
    res.status(500).json({ message: "Failed to restore class" });
  }
});

// ✅ GET ARCHIVED CLASSES (Teacher only)
router.get("/archived", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const archivedClasses = await Class.find({
      ownerId: userId,
      isArchived: true
    })
    .populate("ownerId", "name email")
    .populate("members.userId", "name email");

    res.json({
      success: true,
      data: archivedClasses
    });
  } catch (err) {
    console.error("Fetch archived error:", err);
    res.status(500).json({ message: "Failed to fetch archived classes" });
  }
});

module.exports = router;