// models/Exam.js
const mongoose = require("mongoose");

const examSchema = new mongoose.Schema({
  title: { type: String, required: true },
  fileUrl: { type: String, required: true },
  scheduledAt: { type: Date },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  questions: [
    {
      type: { type: String, enum: ["mcq", "essay", "truefalse"], required: true },
      question: { type: String, required: true },
      options: [String], // for MCQ
      answer: String,    // optional
    }
  ],
  createdAt: { type: Date, default: Date.now },
});

// ✅ Prevent OverwriteModelError
module.exports = mongoose.models.Exam || mongoose.model("Exam", examSchema);
