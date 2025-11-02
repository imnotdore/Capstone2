// models/Class.js
const mongoose = require("mongoose");

const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  exams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Exam", unique: true }], // ✅ unique exam IDs
  createdAt: { type: Date, default: Date.now },
});

// Middleware to ensure exams array has unique values
classSchema.pre("save", function(next) {
  if (this.exams && this.exams.length > 1) {
    this.exams = [...new Set(this.exams.map(id => id.toString()))];
  }
  next();
});

// ✅ check muna kung may existing model bago gumawa ulit
module.exports = mongoose.models.Class || mongoose.model("Class", classSchema);
