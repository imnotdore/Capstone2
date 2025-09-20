// models/Class.js
const mongoose = require("mongoose");

const classSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  exams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Exam" }],
  createdAt: { type: Date, default: Date.now },
});

// ✅ check muna kung may existing model bago gumawa ulit
module.exports = mongoose.models.Class || mongoose.model("Class", classSchema);
