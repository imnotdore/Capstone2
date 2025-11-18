// backend/routes/examRoutes.js - COMPLETE FIXED VERSION
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const Exam = require("../models/Exam");
const Class = require("../models/Class");
const auth = require("../middleware/authMiddleware");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const axios = require('axios');
const router = express.Router();
// ADD THIS DEBUG MIDDLEWARE AT THE TOP OF examRoutes.js
router.use((req, res, next) => {
  console.log(`🔍 Exam Route Accessed: ${req.method} ${req.originalUrl}`);
  next();
});
// ===== MULTER SETUP =====
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1E9) + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.doc', '.txt']; // ADDED .doc and .txt
    const fileExt = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024,
  }
});

// ===== ✅ CRITICAL MISSING ROUTES =====

// ✅ 1. GET EXAM FOR STUDENT TO TAKE - ADD THIS ROUTE
// ✅ ADD THIS ROUTE TO YOUR examRoutes.js FILE
router.get("/take/:examId", auth, async (req, res) => {
  try {
    const { examId } = req.params;
    
    console.log("🎯 STUDENT QUIZ ACCESS - Take route HIT!");
    console.log("🔍 Exam ID:", examId);
    console.log("🔍 User ID:", req.user.id);

    // Validate examId
    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid exam ID format"
      });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      console.log("❌ Exam not found:", examId);
      return res.status(404).json({
        success: false,
        message: "Exam not found"
      });
    }

    // Check if user has access to this exam's class
    const classData = await Class.findById(exam.classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    const isTeacher = classData.ownerId.toString() === req.user.id;
    const isStudent = classData.members.some(member => 
      member.userId && member.userId.toString() === req.user.id
    );

    if (!isTeacher && !isStudent) {
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in this class"
      });
    }

    // Check if exam is available for students
    if (!isTeacher && !exam.isPublished && !exam.isDeployed) {
      return res.status(403).json({
        success: false,
        message: "This exam is not available yet"
      });
    }

    console.log("✅ Exam access granted:", exam.title, "for user:", req.user.id);

    // Prepare exam data for student (hide correct answers)
    const examForStudent = {
      _id: exam._id,
      title: exam.title,
      description: exam.description,
      classId: exam.classId,
      questions: exam.questions.map((question, index) => {
        // For students, hide correct answers but keep question structure
        if (isTeacher) {
          return question; // Teachers see everything
        } else {
          return {
            type: question.type,
            title: question.title,
            required: question.required,
            points: question.points,
            options: question.options,
            order: question.order,
            // Hide correct answers from students
            correctAnswer: undefined,
            correctAnswers: undefined,
            answerKey: undefined
          };
        }
      }),
      totalPoints: exam.totalPoints,
      isPublished: exam.isPublished,
      isDeployed: exam.isDeployed,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt
    };

    res.json({
      success: true,
      data: examForStudent,
      userRole: isTeacher ? "teacher" : "student"
    });

  } catch (err) {
    console.error("❌ Student exam access error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load exam",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ✅ 2. SUBMIT EXAM ANSWERS - ADD THIS ROUTE
router.post("/:examId/submit", auth, async (req, res) => {
  try {
    const { examId } = req.params;
    const { answers } = req.body;

    console.log("📝 Student submitting answers for exam:", examId, "User:", req.user.id);

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({
        success: false,
        message: "Answers are required"
      });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found"
      });
    }

    // Check if user is student in the class
    const classData = await Class.findById(exam.classId);
    const isStudent = classData.members.some(member => 
      member.userId && member.userId.toString() === req.user.id
    );

    if (!isStudent) {
      return res.status(403).json({
        success: false,
        message: "Only students can submit answers"
      });
    }

    // Check if exam is available
    if (!exam.isPublished && !exam.isDeployed) {
      return res.status(403).json({
        success: false,
        message: "This exam is not available for submission"
      });
    }

    // Calculate score (basic implementation)
    let score = 0;
    let maxScore = exam.totalPoints || exam.questions.reduce((sum, q) => sum + (q.points || 1), 0);
    
    exam.questions.forEach((question, index) => {
      const studentAnswer = answers[index];
      
      if (studentAnswer) {
        // Basic scoring logic
        if (question.type === 'multiple-choice' && question.correctAnswer !== undefined) {
          if (studentAnswer === question.options[question.correctAnswer]) {
            score += question.points || 1;
          }
        } else if (question.type === 'checkboxes' && question.correctAnswers) {
          // For checkboxes, check if all correct answers are selected
          const correctOptions = question.correctAnswers.map(idx => question.options[idx]);
          const isCorrect = correctOptions.every(opt => studentAnswer.includes(opt)) && 
                           correctOptions.length === studentAnswer.length;
          if (isCorrect) {
            score += question.points || 1;
          }
        }
        // For essay/short-answer questions, you might want manual grading
      }
    });

    console.log("✅ Answers submitted. Score:", score, "/", maxScore);

    res.json({
      success: true,
      message: "Answers submitted successfully",
      data: {
        score,
        maxScore,
        percentage: Math.round((score / maxScore) * 100)
      }
    });

  } catch (err) {
    console.error("❌ Submit answers error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to submit answers",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ===== EXISTING QUIZ CREATION ROUTES =====

// ✅ CREATE QUIZ
router.post("/create/:classId", auth, async (req, res) => {
  try {
    const { classId } = req.params;
    const { title, description, questions, settings, theme, isPublished, totalPoints } = req.body;

    console.log("🎯 CREATE QUIZ ROUTE HIT:", { 
      classId, 
      title, 
      questions: questions?.length,
      totalPoints: totalPoints || 0
    });

    // Validate required fields
    if (!title || !classId) {
      return res.status(400).json({
        success: false,
        message: "Title and classId are required"
      });
    }

    // Check if user is teacher for this class
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    if (classData.ownerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only teachers can create quizzes"
      });
    }

    // Create new exam/quiz
    const newExam = new Exam({
      title,
      description: description || "Form description",
      classId,
      createdBy: req.user.id,
      questions: questions || [],
      totalPoints: totalPoints || 0,
      isQuiz: true,
      isPublished: isPublished || false,
      settings: settings || {
        collectEmails: false,
        limitOneResponse: false,
        showProgressBar: true,
        confirmationMessage: "Your response has been recorded.",
        allowEditing: true,
        shuffleQuestions: false
      },
      theme: theme || {
        headerColor: "#4285f4",
        themeColor: "#4285f4", 
        fontStyle: "default"
      },
      isDeployed: false,
      fileUrl: null
    });

    const savedExam = await newExam.save();

    // Add to class's exams array
    await Class.findByIdAndUpdate(
      classId,
      { $addToSet: { exams: savedExam._id } }
    );

    console.log("✅ Quiz created successfully:", savedExam._id);

    res.status(201).json({
      success: true,
      message: "Quiz created successfully",
      data: savedExam
    });

  } catch (err) {
    console.error("❌ Create quiz error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to create quiz",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ✅ UPDATE QUIZ QUESTIONS
router.put("/:examId/quiz-questions", auth, async (req, res) => {
  try {
    const { examId } = req.params;
    const { title, description, questions, settings, theme, isPublished, totalPoints } = req.body;

    console.log("🎯 UPDATE QUIZ QUESTIONS ROUTE HIT:", examId);

    // Validate examId
    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid exam ID format"
      });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found"
      });
    }

    // Check if user is authorized to update this quiz
    const classData = await Class.findById(exam.classId);
    if (!classData || classData.ownerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this quiz"
      });
    }

    // Update quiz
    const updateData = {
      updatedAt: new Date()
    };
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (questions !== undefined) updateData.questions = questions;
    if (settings !== undefined) updateData.settings = settings;
    if (theme !== undefined) updateData.theme = theme;
    if (totalPoints !== undefined) updateData.totalPoints = totalPoints;
    if (isPublished !== undefined) {
      updateData.isPublished = isPublished;
      if (isPublished && !exam.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const updatedExam = await Exam.findByIdAndUpdate(
      examId,
      updateData,
      { new: true, runValidators: true }
    );

    console.log("✅ Quiz updated successfully:", examId);

    res.json({
      success: true,
      message: "Quiz updated successfully",
      data: updatedExam
    });

  } catch (err) {
    console.error("❌ Update quiz error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update quiz",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ✅ DEPLOY/PUBLISH EXAM
router.patch("/deploy/:examId", auth, async (req, res) => {
  try {
    const { examId } = req.params;

    console.log("🎯 DEPLOY EXAM ROUTE HIT:", examId);

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found"
      });
    }

    // Check if user is authorized
    const classData = await Class.findById(exam.classId);
    if (!classData || classData.ownerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to deploy this exam"
      });
    }

    const updatedExam = await Exam.findByIdAndUpdate(
      examId,
      { 
        isPublished: true,
        isDeployed: true,
        publishedAt: new Date(),
        updatedAt: new Date()
      },
      { new: true }
    );

    console.log("✅ Exam deployed successfully:", examId);

    res.json({
      success: true,
      message: "Exam published successfully",
      data: updatedExam
    });

  } catch (err) {
    console.error("❌ Deploy exam error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to deploy exam",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ✅ GET QUIZ FOR EDITING
router.get("/:examId/edit", auth, async (req, res) => {
  try {
    const { examId } = req.params;

    console.log("🎯 GET QUIZ FOR EDIT ROUTE HIT:", examId);

    // Validate examId
    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid exam ID format"
      });
    }

    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found"
      });
    }

    // Check if user has access to this quiz's class
    const classData = await Class.findById(exam.classId);
    const hasAccess = classData && (
      classData.ownerId.toString() === req.user.id ||
      classData.members.some(m => m.userId && m.userId.toString() === req.user.id)
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this quiz"
      });
    }

    console.log("✅ Quiz loaded for editing:", examId);

    res.json({
      success: true,
      data: exam
    });

  } catch (err) {
    console.error("❌ Get quiz for edit error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load quiz",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ===== FILE UPLOAD & PARSING ROUTES =====


// Updated upload-parse route using Python service
router.post("/upload-parse", auth, upload.single("file"), async (req, res) => {
  try {
    console.log("🎯 UPLOAD-PARSE STARTED");
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    const filePath = req.file.path;
    const fileType = req.file.mimetype;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    console.log("📁 File:", req.file.originalname);

    let questions = [];
    let usePython = false;

    // Try Python service first (PORT 5001)
    try {
      console.log("🔄 Attempting Python service on port 5001...");
      const FormData = require('form-data');
      const fs = require('fs');
      
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));

      const pythonResponse = await axios.post('http://localhost:5001/parse-file', formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 15000,
      });

      console.log("✅ Python service successful");
      questions = pythonResponse.data.data?.questions || [];
      usePython = true;
      
    } catch (pythonError) {
      console.log("⚠️ Python service failed:", pythonError.message);
      
      // Fallback to Node.js parsing
      console.log("🔄 Using Node.js fallback parser...");
      let extractedText = '';
      
      if (fileType === 'application/pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdfParse(dataBuffer);
        extractedText = data.text;
      } else if (fileType.includes('word') || fileType.includes('document') || fileExt === '.docx' || fileExt === '.doc') {
        const result = await mammoth.extractRawText({ path: filePath });
        extractedText = result.value;
      } else if (fileType === 'text/plain' || fileExt === '.txt') {
        extractedText = fs.readFileSync(filePath, 'utf8');
      }
      
      console.log("📝 Extracted text length:", extractedText.length);
      questions = parseFormattedDocument(extractedText);
    }

    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    if (questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No questions could be extracted from the file."
      });
    }

    res.json({
      success: true,
      data: {
        questions: questions,
        title: `Quiz from ${req.file.originalname}`,
        description: `Automatically imported from ${req.file.originalname}`,
        parsedWith: usePython ? 'python' : 'nodejs'
      }
    });

  } catch (error) {
    console.error("❌ Upload-parse error:", error);
    
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      message: "Failed to process file: " + error.message
    });
  }
});
// ===== OTHER EXISTING ROUTES =====

// ✅ GET ALL EXAMS FOR A CLASS
router.get("/:classId", auth, async (req, res) => {
  try {
    const classId = new mongoose.Types.ObjectId(req.params.classId);
    
    // Check if user has access to this class
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    const hasAccess = classData.ownerId.toString() === req.user.id ||
                     classData.members.some(m => m.userId && m.userId.toString() === req.user.id);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this class"
      });
    }

    const exams = await Exam.find({ classId }).sort({ createdAt: -1 });

    const updatedExams = exams.map((exam) => {
      const relativePath = exam.fileUrl && exam.fileUrl.startsWith("/uploads")
        ? exam.fileUrl
        : exam.fileUrl ? `/uploads/${exam.fileUrl}` : null;
      
      return {
        ...exam._doc,
        fileUrl: relativePath ? `${req.protocol}://${req.get("host")}${relativePath}` : null,
      };
    });

    res.json({ 
      success: true, 
      message: "Exams fetched successfully", 
      data: updatedExams 
    });
  } catch (err) {
    console.error("❌ Fetch exams error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch exams",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ✅ GET DEPLOYED EXAM FOR A CLASS
router.get("/deployed/:classId", auth, async (req, res) => {
  try {
    const classId = new mongoose.Types.ObjectId(req.params.classId);
    
    // Check if user has access to this class
    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({
        success: false,
        message: "Class not found"
      });
    }

    const hasAccess = classData.ownerId.toString() === req.user.id ||
                     classData.members.some(m => m.userId && m.userId.toString() === req.user.id);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this class"
      });
    }

    const exam = await Exam.findOne({ 
      classId, 
      $or: [
        { isDeployed: true },
        { isPublished: true }
      ]
    });
    
    return res.status(200).json({
      success: true,
      message: exam ? "Deployed exam found" : "No deployed exam",
      data: exam || null,
    });
  } catch (err) {
    console.error("❌ Fetch deployed exam error:", err);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to fetch deployed exam",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ✅ DELETE EXAM
router.delete("/:examId", auth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ 
      success: false, 
      message: "Exam not found" 
    });
    
    // ✅ Check if user is class teacher for this exam
    const classData = await Class.findById(exam.classId);
    if (!classData || classData.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ 
      success: false, 
      message: "Not authorized to delete this exam" 
      });
    }

    // Delete associated file
    if (exam.fileUrl) {
      const filename = exam.fileUrl.split('/').pop();
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Class.findByIdAndUpdate(exam.classId, { $pull: { exams: exam._id } });
    await Exam.findByIdAndDelete(req.params.examId);

    res.json({ 
      success: true, 
      message: "Exam deleted successfully" 
    });
  } catch (err) {
    console.error("❌ Delete exam error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete exam",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ✅ GET PARSED QUESTIONS
router.get("/:examId/questions", auth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ 
      success: false, 
      message: "Exam not found" 
    });

    // ✅ Check if user has access to this exam's class
    const classData = await Class.findById(exam.classId);
    const hasAccess = classData && (
      classData.ownerId.toString() === req.user.id ||
      classData.members.some(m => m.userId && m.userId.toString() === req.user.id)
    );

    if (!hasAccess) {
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized to access these questions" 
      });
    }

    res.json({ 
      success: true, 
      message: "Questions fetched successfully", 
      data: exam.questions 
    });
  } catch (err) {
    console.error("❌ Fetch questions error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch questions",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ✅ HEALTH CHECK - UPDATED WITH ALL ROUTES
router.get("/health", (req, res) => {
  console.log("✅ EXAM HEALTH CHECK ROUTE HIT");
  res.json({
    success: true,
    message: "Exam routes are working with STUDENT QUIZ features",
    routes: [
      "POST /create/:classId",
      "POST /upload-parse",
      "PUT /:examId/quiz-questions", 
      "GET /:examId/edit",
      "GET /take/:examId", // ✅ STUDENT QUIZ ACCESS - ADDED
      "POST /:examId/submit", // ✅ STUDENT SUBMIT - ADDED
      "GET /:examId/results",
      "GET /form/:examId",
      "GET /deployed/:classId", 
      "POST /upload/:classId",
      "GET /:classId",
      "DELETE /:examId",
      "DELETE /class/:classId/delete-all",
      "GET /:examId/questions",
      "PATCH /deploy/:examId"
    ],
    timestamp: new Date().toISOString()
  });
});

// ===== HELPER FUNCTIONS =====
function parseFormattedDocument(text) {
  console.log("🔄 STARTING ENHANCED PARSING...");
  
  const questions = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  
  let currentQuestion = null;
  let questionCounter = 0;

  console.log("📄 Total lines to process:", lines.length);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    console.log(`📖 Line ${i}: "${line}"`);

    // Skip empty lines
    if (!line) continue;

    // Detect question with number (1., 2., etc.)
    const questionMatch = line.match(/^(\d+)\.\s*(.+)$/);
    if (questionMatch) {
      // Save previous question
      if (currentQuestion) {
        questions.push(currentQuestion);
        console.log("💾 Saved question:", {
          title: currentQuestion.title?.substring(0, 30),
          type: currentQuestion.type,
          options: currentQuestion.options,
          answer: currentQuestion.correctAnswer ?? currentQuestion.correctAnswers ?? currentQuestion.answerKey
        });
      }
      
      questionCounter++;
      currentQuestion = {
        type: 'multiple-choice', // default type
        title: questionMatch[2],
        required: false,
        points: 1,
        options: [],
        correctAnswer: null,
        correctAnswers: [],
        answerKey: '',
        order: questionCounter - 1
      };
      
      console.log("❓ New question started:", currentQuestion.title.substring(0, 50));
      continue;
    }

    // Detect options (A), B), C), D) - FIXED REGEX
    const optionMatch = line.match(/^([A-D])[\)\.]\s*(.+)$/i);
    if (optionMatch && currentQuestion) {
      const optionText = optionMatch[2].trim();
      currentQuestion.options.push(optionText);
      console.log("📝 Added option:", optionMatch[1], optionText);
      continue;
    }

    // Detect ANSWER (single choice) - CASE INSENSITIVE
    const answerMatch = line.match(/^ANSWER:\s*(.+)$/i);
    if (answerMatch && currentQuestion) {
      const answerValue = answerMatch[1].trim();
      console.log("🎯 Processing ANSWER:", answerValue);
      
      // Check if there are options to determine question type
      if (currentQuestion.options.length > 0) {
        // Has options = multiple choice or checkboxes
        if (answerValue.includes(',')) {
          // Multiple answers = checkboxes
          const answers = answerValue.split(',').map(a => a.trim().toUpperCase());
          const answerIndices = answers.map(a => 'ABCD'.indexOf(a)).filter(idx => idx !== -1);
          
          if (answerIndices.length > 0) {
            currentQuestion.correctAnswers = answerIndices;
            currentQuestion.type = 'checkboxes';
            console.log("✅ Set CHECKBOX answers:", answers, "-> indices:", answerIndices);
          }
        } else {
          // Single answer = multiple choice
          const answerIndex = 'ABCD'.indexOf(answerValue.toUpperCase());
          if (answerIndex !== -1) {
            currentQuestion.correctAnswer = answerIndex;
            currentQuestion.type = 'multiple-choice';
            console.log("✅ Set MULTIPLE-CHOICE answer:", answerValue, "-> index:", answerIndex);
          } else {
            console.log("❌ Invalid answer for multiple-choice:", answerValue);
          }
        }
      } else {
        // No options = text answer
        currentQuestion.answerKey = answerValue;
        // Auto-detect short vs paragraph based on length
        currentQuestion.type = answerValue.length > 50 ? 'paragraph' : 'short-answer';
        console.log("✅ Set TEXT answer:", currentQuestion.type, "->", answerValue);
      }
      continue;
    }

    // Also detect "ANSWERS:" format for checkboxes
    const answersMatch = line.match(/^ANSWERS?:\s*([A-D,\s]+)$/i);
    if (answersMatch && currentQuestion && currentQuestion.options.length > 0) {
      const answersStr = answersMatch[1];
      const answers = answersStr.split(',').map(a => a.trim().toUpperCase());
      const answerIndices = answers.map(a => 'ABCD'.indexOf(a)).filter(idx => idx !== -1);
      
      if (answerIndices.length > 0) {
        currentQuestion.correctAnswers = answerIndices;
        currentQuestion.type = 'checkboxes';
        console.log("✅ Set CHECKBOX answers (ANSWERS: format):", answers, "-> indices:", answerIndices);
      }
      continue;
    }

    // Detect POINTS
    const pointsMatch = line.match(/^POINTS?:\s*(\d+)/i);
    if (pointsMatch && currentQuestion) {
      currentQuestion.points = parseInt(pointsMatch[1]);
      console.log("⭐ Set points:", currentQuestion.points);
      continue;
    }

    // If line looks like an option but didn't match regex, try to add it
    if (currentQuestion && line.match(/^[A-D][\s\.].+/i) && !line.match(/ANSWER|POINTS/i)) {
      const optionText = line.substring(2).trim();
      if (optionText && currentQuestion.options.length < 4) {
        currentQuestion.options.push(optionText);
        console.log("📝 Added inferred option:", line.substring(0, 2), optionText);
      }
    }
  }

  // Add the last question
  if (currentQuestion && currentQuestion.title) {
    questions.push(currentQuestion);
    console.log("💾 Saved final question:", {
      title: currentQuestion.title?.substring(0, 30),
      type: currentQuestion.type,
      options: currentQuestion.options,
      answer: currentQuestion.correctAnswer ?? currentQuestion.correctAnswers ?? currentQuestion.answerKey
    });
  }

  console.log("🎉 PARSING COMPLETE. Total questions:", questions.length);
  
  // Final detailed debug log
  questions.forEach((q, index) => {
    console.log(`📊 FINAL Question ${index + 1}:`, {
      type: q.type,
      title: q.title?.substring(0, 40) + '...',
      options: q.options,
      correctAnswer: q.correctAnswer,
      correctAnswers: q.correctAnswers,
      answerKey: q.answerKey,
      points: q.points
    });
  });
  
  return questions;
}
// ✅ DOCX PARSING FUNCTION
const parseDOCX = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    
    console.log("📝 Extracted DOCX text length:", text.length);
    
    // Try the improved formatted parsing
    const formattedQuestions = parseFormattedDocument(text);
    
    if (formattedQuestions.length > 0) {
      console.log("✅ Successfully parsed formatted document:", formattedQuestions.length, "questions");
      return formattedQuestions;
    }
    
    // Enhanced fallback parsing
    console.log("⚠️ No formatted questions found, using enhanced fallback parsing");
    const questions = [];
    const lines = text.split('\n');
    let currentQuestion = null;
    
    lines.forEach((line, index) => {
      line = line.trim();
      if (!line) return;
      
      // Detect question lines
      const isQuestion = line.endsWith('?') || /^\d+\./.test(line) || (line.length > 20 && /^[A-Z]/.test(line));
      
      if (isQuestion) {
        // Save previous question
        if (currentQuestion) {
          questions.push(currentQuestion);
        }
        
        currentQuestion = {
          type: "essay", // default type
          title: line,
          required: false,
          points: 1,
          options: [],
          correctAnswer: null,
          correctAnswers: [],
          answerKey: "",
          order: questions.length
        };
      }
      // Look for answer patterns in subsequent lines
      else if (currentQuestion && line.match(/^(Answer|ANSWER)/i)) {
        const answerMatch = line.match(/^(?:Answer|ANSWER):\s*(.+)$/i);
        if (answerMatch) {
          currentQuestion.answerKey = answerMatch[1];
          // Auto-detect type based on answer length
          currentQuestion.type = answerMatch[1].length > 50 ? "paragraph" : "short-answer";
        }
      }
    });
    
    // Add the last question
    if (currentQuestion) {
      questions.push(currentQuestion);
    }
    
    console.log("📝 Fallback parsing found:", questions.length, "questions");
    return questions;
    
  } catch (error) {
    console.error("DOCX parsing error:", error);
    throw error;
  }
};
// Backend routes para sa exam session
router.post('/exams/:id/start', async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      { 
        isActive: true,
        startedAt: new Date(),
        isDeployed: true 
      },
      { new: true }
    );
    res.json({ success: true, data: exam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/exams/:id/end', async (req, res) => {
  try {
    const exam = await Exam.findByIdAndUpdate(
      req.params.id,
      { 
        isActive: false,
        endedAt: new Date(),
        isDeployed: false 
      },
      { new: true }
    );
    res.json({ success: true, data: exam });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
module.exports = router;