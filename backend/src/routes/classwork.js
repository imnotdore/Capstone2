// routes/classwork.js
const express = require("express");
const router = express.Router();
const Class = require("../models/Class");
const Assignment = require("../models/Assignment");
const authMiddleware = require("../middleware/authMiddleware");
const { checkClassAccess, checkTeacherAccess } = require("../middleware/classAuth");

// ✅ GET classwork for a class
router.get("/:classId", authMiddleware, checkClassAccess, async (req, res) => {
  try {
    const classData = await Class.findById(req.params.classId)
      .populate({
        path: "classwork",
        populate: { path: "createdBy", select: "name email" }
      });

    res.json({
      success: true,
      data: classData.classwork || []
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ CREATE new classwork item
router.post("/:classId/create", authMiddleware, checkTeacherAccess, async (req, res) => {
  try {
    const { classId } = req.params;
    const { 
      title, 
      description, 
      type, 
      dueDate, 
      points, 
      questions, 
      attachments, 
      topic 
    } = req.body;

    // Create the assignment
    const assignment = await Assignment.create({
      title,
      description,
      type,
      classId,
      createdBy: req.user.id,
      dueDate,
      points,
      questions,
      attachments,
      topic,
      isPublished: true
    });

    // Add to class classwork array and update topics if new
    await Class.findByIdAndUpdate(classId, {
      $push: { 
        classwork: assignment._id
      },
      $addToSet: { topics: topic } // Only add if not exists
    });

    // Populate createdBy for response
    await assignment.populate("createdBy", "name email");

    res.json({
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} created successfully`,
      data: assignment
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ GET topics for a class
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

// ✅ DELETE classwork item
router.delete("/:classId/item/:itemId", authMiddleware, checkTeacherAccess, async (req, res) => {
  try {
    const { classId, itemId } = req.params;

    // Remove from classwork array
    await Class.findByIdAndUpdate(classId, {
      $pull: { classwork: itemId }
    });

    // Delete the assignment
    await Assignment.findByIdAndDelete(itemId);

    res.json({
      success: true,
      message: "Classwork item deleted successfully"
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ UPDATE classwork item
router.put("/:classId/item/:itemId", authMiddleware, checkTeacherAccess, async (req, res) => {
  try {
    const { itemId } = req.params;
    const updateData = req.body;

    const assignment = await Assignment.findByIdAndUpdate(
      itemId, 
      updateData, 
      { new: true }
    ).populate("createdBy", "name email");

    res.json({
      success: true,
      message: "Classwork item updated successfully",
      data: assignment
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;