// routes/announcements.js - COMPLETELY FIXED VERSION
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Announcement = require("../models/Announcement");
const Class = require("../models/Class");
const authMiddleware = require("../middleware/authMiddleware");

// ✅ CREATE ANNOUNCEMENT
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { classId, content, attachments = [], status = 'published', scheduledFor } = req.body;
    const createdBy = req.user.id;

    if (!classId || !content) {
      return res.status(400).json({ 
        success: false,
        message: "Class ID and content are required" 
      });
    }

    // Validate classId
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid class ID format" 
      });
    }

    // Check if user has access to the class
    const classData = await Class.findOne({
      _id: classId,
      $or: [
        { ownerId: createdBy },
        { "members.userId": createdBy }
      ]
    });

    if (!classData) {
      return res.status(403).json({ 
        success: false,
        message: "You don't have access to this class" 
      });
    }

    const announcement = new Announcement({
      classId,
      content,
      attachments,
      createdBy,
      status,
      scheduledFor: status === 'scheduled' ? scheduledFor : null
    });

    await announcement.save();
    
    // Populate createdBy for response
    await announcement.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: "Announcement created successfully",
      data: announcement
    });
  } catch (error) {
    console.error("❌ Create announcement error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to create announcement",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ GET ANNOUNCEMENTS FOR A CLASS (FIXED VERSION)
router.get("/class/:classId", authMiddleware, async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user.id;

    // Validate classId
    if (!classId || !mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid class ID" 
      });
    }

    // Check if user has access to the class
    const classData = await Class.findOne({
      _id: classId,
      $or: [
        { ownerId: userId },
        { "members.userId": userId }
      ]
    });

    if (!classData) {
      return res.status(403).json({ 
        success: false,
        message: "You don't have access to this class" 
      });
    }

    const announcements = await Announcement.find({ 
      classId: classId,
      $or: [
        { status: 'published' },
        { status: 'scheduled', scheduledFor: { $lte: new Date() } }
      ]
    })
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error("❌ Get announcements error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch announcements",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ GET SINGLE ANNOUNCEMENT
router.get("/:announcementId", authMiddleware, async (req, res) => {
  try {
    const { announcementId } = req.params;
    const userId = req.user.id;

    // Validate announcementId
    if (!mongoose.Types.ObjectId.isValid(announcementId)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid announcement ID" 
      });
    }

    const announcement = await Announcement.findById(announcementId)
      .populate('createdBy', 'name email');

    if (!announcement) {
      return res.status(404).json({ 
        success: false,
        message: "Announcement not found" 
      });
    }

    // Check if user has access to the class
    const classData = await Class.findOne({
      _id: announcement.classId,
      $or: [
        { ownerId: userId },
        { "members.userId": userId }
      ]
    });

    if (!classData) {
      return res.status(403).json({ 
        success: false,
        message: "You don't have access to this announcement" 
      });
    }

    res.json({
      success: true,
      data: announcement
    });
  } catch (error) {
    console.error("❌ Get announcement error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch announcement",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ UPDATE ANNOUNCEMENT
router.put("/:announcementId", authMiddleware, async (req, res) => {
  try {
    const { announcementId } = req.params;
    const { content, attachments, status, scheduledFor } = req.body;
    const userId = req.user.id;

    // Validate announcementId
    if (!mongoose.Types.ObjectId.isValid(announcementId)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid announcement ID" 
      });
    }

    const announcement = await Announcement.findById(announcementId);

    if (!announcement) {
      return res.status(404).json({ 
        success: false,
        message: "Announcement not found" 
      });
    }

    // Check if user is the creator
    if (announcement.createdBy.toString() !== userId) {
      return res.status(403).json({ 
        success: false,
        message: "You can only edit your own announcements" 
      });
    }

    if (content) announcement.content = content;
    if (attachments) announcement.attachments = attachments;
    if (status) announcement.status = status;
    if (scheduledFor) announcement.scheduledFor = scheduledFor;

    await announcement.save();
    await announcement.populate('createdBy', 'name email');

    res.json({
      success: true,
      message: "Announcement updated successfully",
      data: announcement
    });
  } catch (error) {
    console.error("❌ Update announcement error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to update announcement",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ DELETE ANNOUNCEMENT
router.delete("/:announcementId", authMiddleware, async (req, res) => {
  try {
    const { announcementId } = req.params;
    const userId = req.user.id;

    // Validate announcementId
    if (!mongoose.Types.ObjectId.isValid(announcementId)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid announcement ID" 
      });
    }

    const announcement = await Announcement.findById(announcementId);

    if (!announcement) {
      return res.status(404).json({ 
        success: false,
        message: "Announcement not found" 
      });
    }

    // Check if user is the creator or class teacher
    const classData = await Class.findById(announcement.classId);
    const isTeacher = classData.ownerId.toString() === userId;
    const isCreator = announcement.createdBy.toString() === userId;

    if (!isTeacher && !isCreator) {
      return res.status(403).json({ 
        success: false,
        message: "You can only delete your own announcements" 
      });
    }

    await Announcement.findByIdAndDelete(announcementId);

    res.json({
      success: true,
      message: "Announcement deleted successfully"
    });
  } catch (error) {
    console.error("❌ Delete announcement error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to delete announcement",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ GET DRAFT ANNOUNCEMENTS
router.get("/class/:classId/drafts", authMiddleware, async (req, res) => {
  try {
    const { classId } = req.params;
    const userId = req.user.id;

    // Validate classId
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid class ID" 
      });
    }

    const drafts = await Announcement.find({ 
      classId,
      createdBy: userId,
      status: 'draft'
    })
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: drafts
    });
  } catch (error) {
    console.error("❌ Get drafts error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to fetch drafts",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;