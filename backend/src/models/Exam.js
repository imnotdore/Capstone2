// models/Exam.js - UPDATED
const mongoose = require("mongoose");

const examSchema = new mongoose.Schema({
  title: { type: String, required: true },
  fileUrl: { type: String, required: true },
  scheduledAt: { type: Date },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // ✅ CHANGED: teacherId → createdBy
  questions: [
    {
      type: { type: String, enum: ["mcq", "essay", "truefalse"], required: true },
      question: { type: String, required: true },
      options: [String],
      answer: String,
    }
  ],
  isDeployed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.models.Exam || mongoose.model("Exam", examSchema);