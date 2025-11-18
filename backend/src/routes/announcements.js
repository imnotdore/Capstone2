const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const Class = require('../models/Class');
const auth = require('../middleware/authMiddleware');

// GET all announcements for a class
router.get('/class/:classId', auth, async (req, res) => {
  try {
    const { classId } = req.params;

    console.log("📢 FETCHING ANNOUNCEMENTS FOR CLASS:", classId);
    console.log("👤 USER ID:", req.user.id);

    // Check if user is enrolled in the class (teacher or student)
    const classData = await Class.findOne({
      _id: classId,
      $or: [
        { ownerId: req.user.id },
        { 'members.userId': req.user.id }
      ]
    });

    if (!classData) {
      console.log("❌ USER NOT AUTHORIZED FOR THIS CLASS");
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to view announcements for this class' 
      });
    }

    const announcements = await Announcement.find({ classId })
      .populate('createdBy', 'name email')
      .populate('comments.author', 'name email')
      .sort({ createdAt: -1 });

    console.log("✅ ANNOUNCEMENTS FETCHED:", announcements.length);

    res.json({
      success: true,
      data: announcements,
      message: 'Announcements fetched successfully'
    });
  } catch (error) {
    console.error('❌ Error fetching announcements:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch announcements',
      error: error.message 
    });
  }
});

// CREATE new announcement
router.post('/', auth, async (req, res) => {
  try {
    const { classId, content, status = 'published' } = req.body;

    console.log("📝 CREATING ANNOUNCEMENT:", { classId, content, user: req.user.id });

    if (!classId || !content) {
      return res.status(400).json({ 
        success: false,
        message: 'Class ID and content are required' 
      });
    }

    // Check if user is teacher of the class
    const classData = await Class.findOne({
      _id: classId,
      $or: [
        { ownerId: req.user.id },
        { 'members.userId': req.user.id, role: 'teacher' }
      ]
    });

    if (!classData) {
      return res.status(403).json({ 
        success: false,
        message: 'Only teachers can create announcements' 
      });
    }

    const announcement = new Announcement({
      classId,
      content,
      status,
      createdBy: req.user.id,
      comments: []
    });

    await announcement.save();
    await announcement.populate('createdBy', 'name email');

    console.log("✅ ANNOUNCEMENT CREATED:", announcement._id);

    res.status(201).json({
      success: true,
      data: announcement,
      message: 'Announcement created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating announcement:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create announcement',
      error: error.message 
    });
  }
});

// UPDATE announcement - FIXED ROUTE
router.put('/:id', auth, async (req, res) => {
  try {
    const { content, status } = req.body;
    const announcementId = req.params.id;

    console.log("🔄 UPDATE ANNOUNCEMENT REQUEST:", {
      announcementId,
      content,
      user: req.user.id
    });

    // Find announcement
    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      console.log("❌ ANNOUNCEMENT NOT FOUND:", announcementId);
      return res.status(404).json({ 
        success: false,
        message: 'Announcement not found' 
      });
    }

    console.log("📋 FOUND ANNOUNCEMENT:", {
      id: announcement._id,
      classId: announcement.classId,
      createdBy: announcement.createdBy
    });

    // Check if user is teacher of the class OR the announcement creator
    const classData = await Class.findOne({
      _id: announcement.classId,
      $or: [
        { ownerId: req.user.id },
        { 'members.userId': req.user.id, role: 'teacher' }
      ]
    });

    const isAnnouncementCreator = announcement.createdBy.toString() === req.user.id;
    const isTeacher = classData && (classData.ownerId.toString() === req.user.id || 
                    classData.members.some(m => m.userId.toString() === req.user.id && m.role === 'teacher'));

    console.log("🔐 PERMISSION CHECK:", {
      isAnnouncementCreator,
      isTeacher,
      announcementCreator: announcement.createdBy.toString(),
      currentUser: req.user.id
    });

    if (!isTeacher && !isAnnouncementCreator) {
      console.log("❌ USER NOT AUTHORIZED TO EDIT");
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to edit this announcement' 
      });
    }

    // Update fields
    if (content) announcement.content = content;
    if (status) announcement.status = status;
    announcement.updatedAt = new Date();

    await announcement.save();
    await announcement.populate('createdBy', 'name email');
    await announcement.populate('comments.author', 'name email');

    console.log("✅ ANNOUNCEMENT UPDATED SUCCESSFULLY");

    res.json({
      success: true,
      data: announcement,
      message: 'Announcement updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating announcement:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update announcement',
      error: error.message 
    });
  }
});

// DELETE announcement - FIXED ROUTE
router.delete('/:id', auth, async (req, res) => {
  try {
    const announcementId = req.params.id;

    console.log("🗑️ DELETE ANNOUNCEMENT REQUEST:", {
      announcementId,
      user: req.user.id
    });

    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({ 
        success: false,
        message: 'Announcement not found' 
      });
    }

    // Check if user is teacher of the class OR the announcement creator
    const classData = await Class.findOne({
      _id: announcement.classId,
      $or: [
        { ownerId: req.user.id },
        { 'members.userId': req.user.id, role: 'teacher' }
      ]
    });

    const isAnnouncementCreator = announcement.createdBy.toString() === req.user.id;
    const isTeacher = classData && (classData.ownerId.toString() === req.user.id || 
                    classData.members.some(m => m.userId.toString() === req.user.id && m.role === 'teacher'));

    console.log("🔐 DELETE PERMISSION CHECK:", {
      isAnnouncementCreator,
      isTeacher
    });

    if (!isTeacher && !isAnnouncementCreator) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to delete this announcement' 
      });
    }

    await Announcement.findByIdAndDelete(announcementId);

    console.log("✅ ANNOUNCEMENT DELETED SUCCESSFULLY");

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting announcement:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete announcement',
      error: error.message 
    });
  }
});

// ADD comment to announcement
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const announcementId = req.params.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({ 
        success: false,
        message: 'Comment content is required' 
      });
    }

    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({ 
        success: false,
        message: 'Announcement not found' 
      });
    }

    // Check if user is enrolled in the class (teacher or student)
    const classData = await Class.findOne({
      _id: announcement.classId,
      $or: [
        { ownerId: req.user.id },
        { 'members.userId': req.user.id }
      ]
    });

    if (!classData) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to comment on this announcement' 
      });
    }

    const newComment = {
      content: content.trim(),
      author: req.user.id,
      createdAt: new Date()
    };

    announcement.comments.push(newComment);
    await announcement.save();
    await announcement.populate('comments.author', 'name email');

    const addedComment = announcement.comments[announcement.comments.length - 1];

    res.status(201).json({
      success: true,
      data: addedComment,
      message: 'Comment added successfully'
    });
  } catch (error) {
    console.error('❌ Error adding comment:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to add comment',
      error: error.message 
    });
  }
});

// DELETE comment from announcement
router.delete('/:announcementId/comments/:commentId', auth, async (req, res) => {
  try {
    const { announcementId, commentId } = req.params;

    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({ 
        success: false,
        message: 'Announcement not found' 
      });
    }

    const comment = announcement.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ 
        success: false,
        message: 'Comment not found' 
      });
    }

    // Check if user is teacher, announcement creator, or comment author
    const classData = await Class.findOne({
      _id: announcement.classId,
      $or: [
        { ownerId: req.user.id },
        { 'members.userId': req.user.id, role: 'teacher' }
      ]
    });

    const isCommentAuthor = comment.author.toString() === req.user.id;
    const isAnnouncementCreator = announcement.createdBy.toString() === req.user.id;
    const isTeacher = classData && (classData.ownerId.toString() === req.user.id || 
                    classData.members.some(m => m.userId.toString() === req.user.id && m.role === 'teacher'));

    if (!isTeacher && !isAnnouncementCreator && !isCommentAuthor) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to delete this comment' 
      });
    }

    announcement.comments.pull(commentId);
    await announcement.save();

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting comment:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete comment',
      error: error.message 
    });
  }
});

module.exports = router;