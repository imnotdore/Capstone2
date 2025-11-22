// backend/models/user.js - UPDATED WITH NOTIFICATION PREFERENCES
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    validate: {
      validator: function(email) {
        return /^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(email);
      },
      message: 'Only Gmail accounts are allowed for registration'
    }
  },
  username: { type: String, sparse: true },
  password: { type: String },
  googleId: { type: String, unique: true, sparse: true },
  
  // Role selection fields
  role: { 
    type: String, 
    enum: ['student', 'teacher'], 
    default: null 
  },
  hasSelectedRole: { type: Boolean, default: false },
  
  // ✅ ADD NOTIFICATION PREFERENCES
  notificationPreferences: {
    // Email notifications
    emailNotifications: { type: Boolean, default: true },
    emailComments: { type: Boolean, default: true },
    emailCommentMentions: { type: Boolean, default: true },
    emailPrivateComments: { type: Boolean, default: true },
    emailTeacherPosts: { type: Boolean, default: true },
    emailReturnedWork: { type: Boolean, default: true },
    emailInvitations: { type: Boolean, default: true },
    emailDueReminders: { type: Boolean, default: true },
    
    // Push notifications
    pushNotifications: { type: Boolean, default: true },
    pushComments: { type: Boolean, default: true },
    pushCommentMentions: { type: Boolean, default: true },
    pushPrivateComments: { type: Boolean, default: true },
    pushTeacherPosts: { type: Boolean, default: true },
    pushReturnedWork: { type: Boolean, default: true },
    pushInvitations: { type: Boolean, default: true },
    pushDueReminders: { type: Boolean, default: true },
    
    // Class-specific settings
    classSettings: {
      type: Map,
      of: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        muted: { type: Boolean, default: false }
      },
      default: {}
    }
  },

  createdClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
  joinedClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationExpires: { type: Date }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);