// models/Class.js - UPDATED
const mongoose = require("mongoose");

const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ✅ CHANGED: teacherId → ownerId
  members: [{ 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["teacher", "student"], default: "student" },
    joinedAt: { type: Date, default: Date.now }
  }],

  exams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Exam", unique: true }],
  createdAt: { type: Date, default: Date.now },
});

// Middleware to ensure exams array has unique values
classSchema.pre("save", function(next) {
  if (this.exams && this.exams.length > 1) {
    this.exams = [...new Set(this.exams.map(id => id.toString()))];
  }
  next();
});

module.exports = mongoose.models.Class || mongoose.model("Class", classSchema);