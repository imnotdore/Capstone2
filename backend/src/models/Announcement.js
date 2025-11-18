const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

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
  },
  // ✅ ADD THIS COMMENTS FIELD
  comments: [commentSchema]
}, {
  timestamps: true
});

// Update the updatedAt field for comments when modified
announcementSchema.pre('save', function(next) {
  if (this.isModified('comments')) {
    this.comments.forEach(comment => {
      if (comment.isModified()) {
        comment.updatedAt = new Date();
      }
    });
  }
  next();
});

module.exports = mongoose.model('Announcement', announcementSchema);