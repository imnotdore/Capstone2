const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: [
      'announcement',
      'assignment',
      'quiz_exam',
      'submission',
      'comment',
      'grade',
      'invitation',
      'due_reminder',
      'system'
    ],
    required: true
  },
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['class', 'announcement', 'assignment', 'exam', 'submission']
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  actionUrl: String,
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date
}, {
  timestamps: true
});

// Index for faster queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);