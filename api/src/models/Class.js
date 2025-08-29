const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },   // e.g. "MOBAP"
    code: { type: String, required: true, unique: true }, // class code na ginagamit ng students
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    exams: [{ type: mongoose.Schema.Types.ObjectId, ref: "Exam" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Class", classSchema);
