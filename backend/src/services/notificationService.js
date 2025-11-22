const Notification = require('../models/Notification');
const User = require('../models/User');
const Class = require('../models/Class');
const emailService = require('./emailService');

class NotificationService {
  // Create notification and send email if enabled
  async createNotification(notificationData) {
    try {
      const notification = new Notification(notificationData);
      await notification.save();
      
      // Send email notification if user has email notifications enabled
      const user = await User.findById(notificationData.userId);
      if (user && user.notificationPreferences?.emailNotifications) {
        const emailSent = await emailService.sendNotificationEmail(user.email, notification);
        if (emailSent) {
          notification.emailSent = true;
          notification.emailSentAt = new Date();
          await notification.save();
        }
      }
      
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Notify class members about new announcement
  async notifyClassAboutAnnouncement(classId, announcement, createdBy) {
    try {
      const classData = await Class.findById(classId).populate('members.userId');
      if (!classData) return;

      const notifications = [];
      
      for (const member of classData.members) {
        // Skip if member has muted notifications for this class
        if (member.isMuted) continue;
        
        // Skip the creator
        if (member.userId._id.toString() === createdBy.toString()) continue;

        const notification = await this.createNotification({
          userId: member.userId._id,
          title: 'New Announcement',
          message: `New announcement in ${classData.name}: ${announcement.content.substring(0, 100)}...`,
          type: 'announcement',
          relatedEntity: {
            entityType: 'announcement',
            entityId: announcement._id
          },
          classId: classId,
          actionUrl: `/class/${classId}?tab=stream`
        });
        
        notifications.push(notification);
      }

      return notifications;
    } catch (error) {
      console.error('Error notifying class about announcement:', error);
    }
  }

  // Notify class members about new assignment/quiz
  async notifyClassAboutAssignment(classId, assignment, createdBy) {
    try {
      const classData = await Class.findById(classId).populate('members.userId');
      if (!classData) return;

      const notifications = [];
      const isQuiz = assignment.type === 'quiz' || assignment.isQuiz;
      
      for (const member of classData.members) {
        if (member.isMuted) continue;
        if (member.userId._id.toString() === createdBy.toString()) continue;

        const notification = await this.createNotification({
          userId: member.userId._id,
          title: isQuiz ? 'New Quiz' : 'New Assignment',
          message: `${isQuiz ? 'Quiz' : 'Assignment'} "${assignment.title}" posted in ${classData.name}`,
          type: isQuiz ? 'quiz_exam' : 'assignment',
          relatedEntity: {
            entityType: isQuiz ? 'exam' : 'assignment',
            entityId: assignment._id
          },
          classId: classId,
          actionUrl: `/class/${classId}?tab=classwork`
        });
        
        notifications.push(notification);
      }

      return notifications;
    } catch (error) {
      console.error('Error notifying class about assignment:', error);
    }
  }

  // Notify teacher about student submission
  async notifyTeacherAboutSubmission(classId, assignment, student, submission) {
    try {
      const classData = await Class.findById(classId).populate('ownerId');
      if (!classData) return;

      const notification = await this.createNotification({
        userId: classData.ownerId._id,
        title: 'Assignment Submitted',
        message: `${student.name} submitted "${assignment.title}"`,
        type: 'submission',
        relatedEntity: {
          entityType: 'submission',
          entityId: submission._id
        },
        classId: classId,
        priority: 'medium',
        actionUrl: `/class/${classId}?tab=grades`
      });

      return notification;
    } catch (error) {
      console.error('Error notifying teacher about submission:', error);
    }
  }

  // Notify about new comment
  async notifyAboutComment(classId, announcement, comment, commenter) {
    try {
      const classData = await Class.findById(classId);
      if (!classData) return;

      // Notify announcement creator (if not the commenter)
      if (announcement.createdBy.toString() !== commenter._id.toString()) {
        await this.createNotification({
          userId: announcement.createdBy,
          title: 'New Comment',
          message: `${commenter.name} commented on your announcement`,
          type: 'comment',
          relatedEntity: {
            entityType: 'announcement',
            entityId: announcement._id
          },
          classId: classId,
          actionUrl: `/class/${classId}?tab=stream`
        });
      }

      // Notify other users who commented (if any)
      if (announcement.comments && announcement.comments.length > 0) {
        const uniqueCommenters = new Set();
        
        announcement.comments.forEach(comment => {
          if (comment.author.toString() !== commenter._id.toString() && 
              comment.author.toString() !== announcement.createdBy.toString()) {
            uniqueCommenters.add(comment.author.toString());
          }
        });

        for (const commenterId of uniqueCommenters) {
          await this.createNotification({
            userId: commenterId,
            title: 'New Reply',
            message: `${commenter.name} also commented on an announcement you commented on`,
            type: 'comment',
            relatedEntity: {
              entityType: 'announcement',
              entityId: announcement._id
            },
            classId: classId,
            actionUrl: `/class/${classId}?tab=stream`
          });
        }
      }
    } catch (error) {
      console.error('Error notifying about comment:', error);
    }
  }

  // Send due date reminders
  async sendDueDateReminders() {
    try {
      // This would typically be called by a cron job
      // For now, it's a placeholder for due date reminder logic
      console.log('Due date reminder service would run here');
    } catch (error) {
      console.error('Error sending due date reminders:', error);
    }
  }

  // Get user notifications
  async getUserNotifications(userId, limit = 20, page = 1) {
    try {
      const skip = (page - 1) * limit;
      
      const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('classId', 'name code')
        .lean();

      const total = await Notification.countDocuments({ userId });
      
      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true },
        { new: true }
      );
      
      return notification;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  // Mark all notifications as read
  async markAllAsRead(userId) {
    try {
      const result = await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true }
      );
      
      return result;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  // Get unread count
  async getUnreadCount(userId) {
    try {
      const count = await Notification.countDocuments({ 
        userId, 
        isRead: false 
      });
      
      return count;
    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }
}

module.exports = new NotificationService();