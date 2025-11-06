const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const auth = require('../middleware/auth');

// Create announcement
router.post('/', auth, async (req, res) => {
  try {
    const { classId, content, attachments, scheduledFor } = req.body;
    
    const announcement = new Announcement({
      classId,
      content,
      attachments: attachments || [],
      createdBy: req.user.id,
      scheduledFor: scheduledFor || null,
      status: scheduledFor ? 'scheduled' : 'published'
    });

    await announcement.save();
    res.status(201).json({ message: 'Announcement created successfully', data: announcement });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get announcements for a class
router.get('/class/:classId', auth, async (req, res) => {
  try {
    const { classId } = req.params;
    const announcements = await Announcement.find({ 
      classId,
      status: 'published'
    })
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

    res.json({ data: announcements });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Save draft
router.post('/draft', auth, async (req, res) => {
  try {
    const { classId, content, attachments } = req.body;
    
    const announcement = new Announcement({
      classId,
      content,
      attachments: attachments || [],
      createdBy: req.user.id,
      status: 'draft'
    });

    await announcement.save();
    res.status(201).json({ message: 'Draft saved successfully', data: announcement });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;