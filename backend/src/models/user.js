// backend/models/user.js
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
  
  // NEW: Role selection fields
  role: { 
    type: String, 
    enum: ['student', 'teacher',], 
    default: null 
  },
  hasSelectedRole: { type: Boolean, default: false },
  
  createdClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
  joinedClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationExpires: { type: Date }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);