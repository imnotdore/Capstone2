// backend/models/Exam.js - COMPLETE FIXED VERSION
const mongoose = require("mongoose");

const examSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "Quiz description" },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  
  // Quiz/Exam specific fields
  isQuiz: { type: Boolean, default: false },
  isDeployed: { type: Boolean, default: false },
  isPublished: { type: Boolean, default: false }, // ✅ ADD THIS MISSING FIELD
  totalPoints: { type: Number, default: 0 },
  
  // Questions array with enhanced answer key functionality
  questions: [{
    type: { 
      type: String, 
      enum: [
        "multiple-choice", 
        "checkboxes", 
        "dropdown", 
        "short-answer", 
        "paragraph", 
        "linear-scale", 
        "multiple-choice-grid", 
        "checkbox-grid"
      ],
      required: true 
    },
    title: { type: String, required: true },
    required: { type: Boolean, default: false },
    points: { type: Number, default: 1 },
    order: { type: Number, default: 0 },
    
    // For multiple choice, checkboxes, dropdown
    options: [String],
    
    // ✅ ANSWER KEY FIELDS
    correctAnswer: { 
      type: mongoose.Schema.Types.Mixed, 
      default: null 
    },
    correctAnswers: { 
      type: [mongoose.Schema.Types.Mixed], 
      default: [] 
    },
    answerKey: { 
      type: String, 
      default: "" 
    },
    
    // For linear scale
    scale: {
      min: { type: Number, default: 1 },
      max: { type: Number, default: 5 },
      minLabel: { type: String, default: "" },
      maxLabel: { type: String, default: "" }
    },
    
    // For grid types
    rows: [String],
    columns: [String]
  }],
  
  // File upload fields
  fileUrl: { type: String },
  scheduledAt: { type: Date },
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  publishedAt: { type: Date } // ✅ ADD THIS FIELD TOO
});

// ✅ Calculate total points before saving
examSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  
  // Calculate total points
  if (this.questions && this.questions.length > 0) {
    this.totalPoints = this.questions.reduce((total, question) => {
      return total + (question.points || 1);
    }, 0);
  } else {
    this.totalPoints = 0;
  }
  
  next();
});

module.exports = mongoose.models.Exam || mongoose.model("Exam", examSchema);