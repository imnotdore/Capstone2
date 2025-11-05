// models/User.js 
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, sparse: true },
  password: { type: String },
  googleId: { type: String, unique: true, sparse: true },
  createdClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
  joinedClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
  verificationExpires: { type: Date }
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);