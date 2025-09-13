// models/User.js
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["student", "teacher"], required: true },
  studentId: { type: String },
  teacherId: { type: String },
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model("User", UserSchema);
