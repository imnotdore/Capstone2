const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    class: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
    questions: { type: Array, default: [] }, // later pwede natin ayusin structure
    fileUrl: { type: String }, // kung uploaded file (Word/PDF)
    schedule: {
      start: Date,
      end: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Exam", examSchema);
