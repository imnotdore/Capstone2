const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema({
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  attachments: [{
    type: {
      type: String,
      enum: ['file', 'link', 'video', 'drive'],
      required: true
    },
    url: String,
    name: String,
    thumbnail: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'scheduled'],
    default: 'published'
  },
  scheduledFor: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Announcement', announcementSchema);