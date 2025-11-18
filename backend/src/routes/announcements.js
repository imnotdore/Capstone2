// routes/announcements.js - FIXED VERSION
const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const Class = require('../models/Class');
const auth = require('../middleware/authMiddleware');

// GET all announcements for a class - FIXED FOR STUDENTS
router.get('/class/:classId', auth, async (req, res) => {
  try {
    const { classId } = req.params;

    // Check if user is enrolled in the class (teacher or student)
    const classData = await Class.findOne({
      _id: classId,
      $or: [
        { ownerId: req.user.id },
        { 'members.userId': req.user.id }
      ]
    });

    if (!classData) {
      return res.status(403).json({ 
        message: 'Not authorized to view announcements for this class' 
      });
    }

    const announcements = await Announcement.find({ classId })
      .populate('createdBy', 'name email')
      .populate('comments.author', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: announcements,
      message: 'Announcements fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({ 
      message: 'Failed to fetch announcements',
      error: error.message 
    });
  }
});

// CREATE new announcement - FIXED
router.post('/', auth, async (req, res) => {
  try {
    const { classId, content, status = 'published' } = req.body;

    if (!classId || !content) {
      return res.status(400).json({ 
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

    res.status(201).json({
      success: true,
      data: announcement,
      message: 'Announcement created successfully'
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({ 
      message: 'Failed to create announcement',
      error: error.message 
    });
  }
});

// UPDATE announcement - FIXED PERMISSIONS
router.put('/:id', auth, async (req, res) => {
  try {
    const { content, status } = req.body;
    const announcementId = req.params.id;

    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // FIXED: Check if user is teacher of the class OR the announcement creator
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

    if (!isTeacher && !isAnnouncementCreator) {
      return res.status(403).json({ 
        message: 'Not authorized to edit this announcement' 
      });
    }

    if (content) announcement.content = content;
    if (status) announcement.status = status;
    announcement.updatedAt = new Date();

    await announcement.save();
    await announcement.populate('createdBy', 'name email');
    await announcement.populate('comments.author', 'name email');

    res.json({
      success: true,
      data: announcement,
      message: 'Announcement updated successfully'
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({ 
      message: 'Failed to update announcement',
      error: error.message 
    });
  }
});

// DELETE announcement - FIXED PERMISSIONS
router.delete('/:id', auth, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    // FIXED: Check if user is teacher of the class OR the announcement creator
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

    if (!isTeacher && !isAnnouncementCreator) {
      return res.status(403).json({ 
        message: 'Not authorized to delete this announcement' 
      });
    }

    await Announcement.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({ 
      message: 'Failed to delete announcement',
      error: error.message 
    });
  }
});

// ADD comment to announcement - FIXED FOR STUDENTS
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const announcementId = req.params.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({ 
        message: 'Comment content is required' 
      });
    }

    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
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
    console.error('Error adding comment:', error);
    res.status(500).json({ 
      message: 'Failed to add comment',
      error: error.message 
    });
  }
});

// DELETE comment - FIXED PERMISSIONS
router.delete('/:announcementId/comments/:commentId', auth, async (req, res) => {
  try {
    const { announcementId, commentId } = req.params;

    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({ message: 'Announcement not found' });
    }

    const comment = announcement.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    // FIXED: Check permissions - comment author OR teacher OR announcement creator
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

    if (!isCommentAuthor && !isAnnouncementCreator && !isTeacher) {
      return res.status(403).json({ 
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
    console.error('Error deleting comment:', error);
    res.status(500).json({ 
      message: 'Failed to delete comment',
      error: error.message 
    });
  }
});

module.exports = router;