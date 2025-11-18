// backend/routes/examRoutes.js - UPDATED WITH ANSWER KEY & POINTS FUNCTIONALITY
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
const axios = require("axios");
const FormData = require("form-data");
const { checkClassAccess, checkTeacherAccess } = require("../middleware/classAuth");

const router = express.Router();
console.log("🔧 Exam routes loaded - quiz creation endpoints added");

// ===== FILE PARSING FUNCTIONS =====
const parsePDF = async (filePath) => {
  try {
    try {
      const pythonResult = await callPythonService(filePath, 'pdf');
      if (pythonResult.questions && pythonResult.questions.length > 0) {
        return pythonResult.questions;
      }
    } catch (pyError) {
      console.log("Python service failed, using fallback:", pyError.message);
    }

    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    
    const questions = [];
    const text = pdfData.text;
    
    const questionPatterns = [
      /\b\d+\.\s*(.+?\?)/g,
      /\bQ\s*\d*\.?\s*(.+?\?)/g,
      /\bQuestion\s*\d*:?\s*(.+?\?)/g,
      /([A-Z][^.!?]*\?)/g
    ];
    
    for (const pattern of questionPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const questionText = match[1].trim();
        if (questionText.length > 10) {
          questions.push({
            type: "essay",
            title: questionText,
            question: questionText,
            options: [],
            required: false,
            points: 1,
            correctAnswer: null,
            correctAnswers: [],
            answerKey: ""
          });
        }
      }
    }
    
    return questions;
  } catch (error) {
    console.error("PDF parsing error:", error);
    throw error;
  }
};

const parseDOCX = async (filePath) => {
  try {
    try {
      const pythonResult = await callPythonService(filePath, 'docx');
      if (pythonResult.questions && pythonResult.questions.length > 0) {
        return pythonResult.questions;
      }
    } catch (pyError) {
      console.log("Python service failed, using fallback:", pyError.message);
    }

    const result = await mammoth.extractRawText({ path: filePath });
    const questions = [];
    const lines = result.value.split('\n');
    
    lines.forEach(line => {
      line = line.trim();
      if (!line) return;
      
      if (line.endsWith('?') || 
          /^\d+\./.test(line) ||
          /^[A-Z]\./.test(line) ||
          /^[a-z]\)/.test(line) ||
          /question/i.test(line)) {
        
        questions.push({
          type: "essay",
          title: line,
          question: line,
          options: [],
          required: false,
          points: 1,
          correctAnswer: null,
          correctAnswers: [],
          answerKey: ""
        });
      }
    });
    
    return questions;
  } catch (error) {
    console.error("DOCX parsing error:", error);
    throw error;
  }
};

const parseExcel = async (filePath) => {
  try {
    try {
      const pythonResult = await callPythonService(filePath, 'excel');
      if (pythonResult.questions && pythonResult.questions.length > 0) {
        return pythonResult.questions;
      }
    } catch (pyError) {
      console.log("Python service failed for Excel:", pyError.message);
      throw new Error("Excel processing requires Python service");
    }
  } catch (error) {
    console.error("Excel parsing error:", error);
    throw error;
  }
};

const callPythonService = async (filePath, fileType) => {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    
    const response = await axios.post('http://localhost:5001/process-file', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000
    });
    
    return response.data;
  } catch (error) {
    console.error("Python service call failed:", error.message);
    throw error;
  }
};

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
    const allowedTypes = ['.pdf', '.docx', '.xlsx', '.xls'];
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

// ===== FIXED QUIZ CREATION ENDPOINTS =====

// ✅ CREATE QUIZ (UPDATED WITH ANSWER KEY & POINTS)
router.post("/create/:classId", auth, async (req, res) => {
  try {
    const { classId } = req.params;
    const { title, description, questions, settings, theme, isPublished, totalPoints } = req.body;

    console.log("🎯 CREATE QUIZ ROUTE HIT:", { 
      classId, 
      title, 
      questions: questions?.length,
      totalPoints: totalPoints || 0,
      settings: !!settings,
      theme: !!theme
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

    // Create new exam/quiz with enhanced fields including answer keys
    const newExam = new Exam({
      title,
      description: description || "Form description",
      classId,
      createdBy: req.user.id,
      questions: questions || [],
      totalPoints: totalPoints || 0, // ✅ ADDED: Total points
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

    console.log("✅ Quiz created successfully:", savedExam._id, "Total Points:", savedExam.totalPoints);

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

// ✅ UPDATE QUIZ QUESTIONS (UPDATED WITH ANSWER KEY & POINTS)
router.put("/:examId/quiz-questions", auth, async (req, res) => {
  try {
    const { examId } = req.params;
    const { title, description, questions, settings, theme, isPublished, totalPoints } = req.body;

    console.log("🎯 UPDATE QUIZ QUESTIONS ROUTE HIT:", examId, "Total Points:", totalPoints);

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

    // Update quiz with all fields including answer keys and points
    const updateData = {
      updatedAt: new Date()
    };
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (questions !== undefined) updateData.questions = questions;
    if (settings !== undefined) updateData.settings = settings;
    if (theme !== undefined) updateData.theme = theme;
    if (totalPoints !== undefined) updateData.totalPoints = totalPoints; // ✅ ADDED: Total points
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

    console.log("✅ Quiz updated successfully:", examId, "New Total Points:", updatedExam.totalPoints);

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

// ✅ DEPLOY/ PUBLISH EXAM (FIXED ENDPOINT)
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

    console.log("✅ Exam deployed successfully:", examId, "Total Points:", updatedExam.totalPoints);

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

// ✅ GET QUIZ FOR EDITING (FIXED ENDPOINT)
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

    console.log("✅ Quiz loaded for editing:", examId, "Total Points:", exam.totalPoints);

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

// ✅ GET QUIZ FOR STUDENT TO TAKE (FIXED ENDPOINT)
router.get("/take/:examId", auth, async (req, res) => {
  try {
    const { examId } = req.params;

    console.log("🎯 GET QUIZ FOR STUDENT ROUTE HIT:", examId);

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

    // Check if quiz is deployed and published - FIXED LOGIC
    if (!exam.isPublished && !exam.isDeployed) {
      return res.status(403).json({
        success: false,
        message: "This quiz is not available for taking"
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
        message: "Not authorized to take this quiz"
      });
    }

    console.log("✅ Quiz loaded for student:", examId, "Total Points:", exam.totalPoints);

    res.json({
      success: true,
      data: exam
    });

  } catch (err) {
    console.error("❌ Get quiz for student error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load quiz",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ✅ SUBMIT QUIZ ANSWERS (ENHANCED WITH AUTO-GRADING)
router.post("/:examId/submit", auth, async (req, res) => {
  try {
    const { examId } = req.params;
    const { answers } = req.body;

    console.log("🎯 SUBMIT QUIZ ANSWERS ROUTE HIT:", examId);

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

    // Check if quiz is available for taking
    if (!exam.isPublished && !exam.isDeployed) {
      return res.status(403).json({
        success: false,
        message: "This quiz is not available for taking"
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
        message: "Not authorized to take this quiz"
      });
    }

    // ✅ ADDED: Auto-grading functionality
    let score = 0;
    let maxScore = exam.totalPoints || 0;
    const gradingResults = [];

    if (exam.questions && exam.questions.length > 0) {
      exam.questions.forEach((question, index) => {
        const userAnswer = answers[`q${index}`];
        let isCorrect = false;
        let pointsEarned = 0;

        if (userAnswer) {
          switch (question.type) {
            case 'multiple-choice':
              if (question.correctAnswer !== null && question.correctAnswer === parseInt(userAnswer)) {
                isCorrect = true;
                pointsEarned = question.points || 1;
                score += pointsEarned;
              }
              break;
            
            case 'checkboxes':
              if (question.correctAnswers && question.correctAnswers.length > 0) {
                const userAnswers = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
                const allCorrect = question.correctAnswers.every(correctIdx => 
                  userAnswers.includes(correctIdx.toString())
                ) && userAnswers.length === question.correctAnswers.length;
                
                if (allCorrect) {
                  isCorrect = true;
                  pointsEarned = question.points || 1;
                  score += pointsEarned;
                }
              }
              break;
            
            case 'short-answer':
            case 'paragraph':
              // For text answers, we'll just record the answer for manual grading
              // You could implement text similarity checking here later
              pointsEarned = 0; // Manual grading required
              break;
            
            default:
              pointsEarned = 0;
          }
        }

        gradingResults.push({
          questionIndex: index,
          questionTitle: question.title,
          userAnswer: userAnswer,
          correct: isCorrect,
          pointsEarned: pointsEarned,
          maxPoints: question.points || 1
        });
      });
    }

    console.log("✅ Quiz answers submitted by user:", req.user.id);
    console.log("📊 Grading results - Score:", score, "/", maxScore);
    console.log("📝 Answers:", answers);

    res.json({
      success: true,
      message: "Quiz submitted successfully",
      data: {
        examId,
        submittedAt: new Date(),
        answersCount: Object.keys(answers).length,
        studentId: req.user.id,
        studentName: req.user.name,
        score: score,
        maxScore: maxScore,
        percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
        gradingResults: gradingResults
      }
    });

  } catch (err) {
    console.error("❌ Submit quiz error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to submit quiz",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ✅ GET QUIZ RESULTS (NEW ENDPOINT)
router.get("/:examId/results", auth, async (req, res) => {
  try {
    const { examId } = req.params;

    console.log("🎯 GET QUIZ RESULTS ROUTE HIT:", examId);

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

    // Check if user is authorized (teacher only)
    const classData = await Class.findById(exam.classId);
    if (!classData || classData.ownerId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only teachers can view quiz results"
      });
    }

    // In a real implementation, you would fetch submissions from a database
    // For now, return the exam with answer keys for teacher review
    res.json({
      success: true,
      message: "Quiz results loaded successfully",
      data: {
        exam: exam,
        answerKeys: exam.questions.map((q, index) => ({
          questionIndex: index,
          questionTitle: q.title,
          correctAnswer: q.correctAnswer,
          correctAnswers: q.correctAnswers,
          answerKey: q.answerKey,
          points: q.points || 1,
          type: q.type
        })),
        totalPoints: exam.totalPoints
      }
    });

  } catch (err) {
    console.error("❌ Get quiz results error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to load quiz results",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ✅ DELETE ALL QUIZZES/FORMS FOR A CLASS (TEACHER ONLY)
router.delete("/class/:classId/delete-all", auth, async (req, res) => {
  try {
    const { classId } = req.params;
    const teacherId = req.user.id;

    console.log("🎯 DELETE ALL QUIZZES ROUTE HIT:", { classId, teacherId });

    // Validate classId
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid class ID format"
      });
    }

    // Verify the teacher owns this class
    const classObj = await Class.findOne({ _id: classId, ownerId: teacherId });
    if (!classObj) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to delete forms from this class"
      });
    }

    // Find all exams/quizzes for this class created by this teacher
    const examsToDelete = await Exam.find({ 
      classId: classId,
      createdBy: teacherId
    });

    if (examsToDelete.length === 0) {
      return res.json({
        success: true,
        message: "No quizzes/forms found to delete",
        deletedCount: 0
      });
    }

    // Delete associated files
    examsToDelete.forEach(exam => {
      if (exam.fileUrl) {
        const filename = exam.fileUrl.split('/').pop();
        const filePath = path.join(uploadDir, filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    });

    // Delete all exams
    const result = await Exam.deleteMany({ 
      classId: classId,
      createdBy: teacherId
    });

    // Remove exams from class's exams array
    await Class.findByIdAndUpdate(
      classId,
      { $set: { exams: [] } }
    );

    console.log("✅ All quizzes deleted successfully:", result.deletedCount);

    res.json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} quizzes/forms`,
      deletedCount: result.deletedCount
    });

  } catch (err) {
    console.error("❌ Delete all quizzes error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete quizzes",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ===== EXISTING EXAM ROUTES =====

// ✅ Health check for exams
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Exam routes are working",
    routes: [
      "POST /create/:classId",
      "PUT /:examId/quiz-questions", 
      "GET /:examId/edit",
      "GET /take/:examId",
      "POST /:examId/submit",
      "GET /:examId/results", // ✅ ADDED: Results endpoint
      "GET /form/:examId",
      "GET /deployed/:classId", 
      "POST /upload/:classId",
      "GET /:classId",
      "DELETE /:examId",
      "DELETE /class/:classId/delete-all",
      "GET /:examId/questions",
      "PATCH /deploy/:examId"
    ]
  });
});

// ✅ Get exam form (Public route - no auth needed for taking exam)
router.get("/form/:examId", async (req, res) => {
  try {
    console.log("🎯 FORM ROUTE HIT for exam:", req.params.examId);
    
    // Validate examId
    if (!mongoose.Types.ObjectId.isValid(req.params.examId)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid exam ID format" 
      });
    }

    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      console.log("❌ Exam not found:", req.params.examId);
      return res.status(404).json({ 
        success: false, 
        message: "Exam not found" 
      });
    }

    console.log("✅ Exam found:", exam.title, "Questions:", exam.questions.length, "Total Points:", exam.totalPoints);
    
    const formHTML = generateFormHTML(exam);
    res.send(formHTML);

  } catch (err) {
    console.error("❌ Generate form error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to generate exam form",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ✅ Get deployed exam for a class (Any class member can access)
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

// ✅ Upload exam (TEACHER ONLY)
router.post("/upload/:classId", auth, upload.single("file"), async (req, res) => {
  try {
    const { classId } = req.params;
    const { title, scheduledAt } = req.body;

    // Check if user is teacher for this class
    const classData = await Class.findById(classId);
    if (!classData || classData.ownerId.toString() !== req.user.id) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({
        success: false,
        message: "Only teachers can upload exams"
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: "No file uploaded" 
      });
    }

    if (!title) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        success: false, 
        message: "Exam title is required" 
      });
    }

    let questions = [];
    const ext = path.extname(req.file.originalname).toLowerCase();
    
    try {
      switch (ext) {
        case ".pdf":
          questions = await parsePDF(req.file.path);
          break;
        case ".docx":
          questions = await parseDOCX(req.file.path);
          break;
        case ".xlsx":
        case ".xls":
          questions = await parseExcel(req.file.path);
          break;
        default:
          throw new Error("Unsupported file type");
      }
    } catch (parseError) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        success: false, 
        message: `File parsing failed: ${parseError.message}` 
      });
    }

    // If no questions detected, provide helpful message
    if (questions.length === 0) {
      questions.push({
        type: "essay",
        title: "No questions were automatically detected. Please manually add questions or check your file format.",
        question: "No questions were automatically detected. Please manually add questions or check your file format.",
        options: [],
        required: false,
        points: 1,
        correctAnswer: null,
        correctAnswers: [],
        answerKey: ""
      });
    }

    const newExam = new Exam({
      title,
      fileUrl: `/uploads/${req.file.filename}`,
      classId,
      createdBy: req.user.id,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      questions,
      isDeployed: false,
      isPublished: false,
    });

    await newExam.save();
    
    // Update class with unique exam IDs
    await Class.findByIdAndUpdate(classId, { 
      $addToSet: { exams: newExam._id } 
    });

    res.json({
      success: true,
      message: `Exam uploaded successfully with ${questions.length} questions extracted`,
      data: {
        ...newExam._doc,
        fileUrl: `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`,
      },
    });

  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("❌ Upload exam error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to upload exam",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ✅ Get all exams for a class (Any class member can access)
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

// ✅ Delete exam (TEACHER ONLY)
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

// ✅ Get parsed questions (Any class member can access)
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

// ===== HELPER FUNCTIONS =====
function generateFormHTML(exam) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${exam.title} - Online Exam</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8f9fa; color: #202124; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .header { background: white; border-radius: 8px; padding: 30px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-top: 4px solid #4285f4; }
        .exam-title { font-size: 24px; font-weight: 400; color: #202124; margin-bottom: 8px; }
        .exam-description { color: #5f6368; font-size: 14px; }
        .question-card { background: white; border-radius: 8px; padding: 25px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.1); border: 1px solid #dadce0; }
        .question-number { font-size: 16px; color: #4285f4; font-weight: 500; margin-bottom: 8px; }
        .question-text { font-size: 16px; color: #202124; margin-bottom: 16px; font-weight: 400; }
        .answer-field { width: 100%; min-height: 120px; padding: 12px; border: 1px solid #dadce0; border-radius: 4px; font-family: inherit; font-size: 14px; resize: vertical; transition: border 0.2s; }
        .answer-field:focus { outline: none; border-color: #4285f4; box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2); }
        .submit-section { background: white; border-radius: 8px; padding: 25px; margin-top: 20px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .submit-btn { background: #4285f4; color: white; border: none; padding: 12px 32px; border-radius: 4px; font-size: 14px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
        .submit-btn:hover { background: #3367d6; }
        .char-count { font-size: 12px; color: #5f6368; text-align: right; margin-top: 4px; }
        .timer { background: #f8f9fa; border: 1px solid #dadce0; border-radius: 4px; padding: 10px 16px; font-size: 14px; color: #5f6368; display: inline-block; margin-bottom: 20px; }
        .points-info { background: #e8f0fe; padding: 10px; border-radius: 4px; margin-bottom: 15px; font-size: 14px; color: #1a73e8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="exam-title">${exam.title}</h1>
            <div class="exam-description">${exam.description || "Please answer all questions below. Your responses will be saved automatically."}</div>
            ${exam.totalPoints > 0 ? `<div class="points-info"><strong>Total Points: ${exam.totalPoints}</strong></div>` : ''}
        </div>
        
        <form id="examForm">
            ${exam.questions.map((question, index) => `
                <div class="question-card">
                    <div class="question-number">Question ${index + 1} ${question.points > 1 ? `(${question.points} points)` : ''}</div>
                    <div class="question-text">${question.title || question.question}</div>
                    <textarea class="answer-field" name="q${index}" placeholder="Type your answer here..." oninput="updateCharCount(this)"></textarea>
                    <div class="char-count"><span id="charCount${index}">0</span> characters</div>
                </div>
            `).join('')}
            
            <div class="submit-section">
                <button type="submit" class="submit-btn">Submit Answers</button>
            </div>
        </form>
    </div>

    <script>
        function updateCharCount(textarea) {
            const index = textarea.name.replace('q', '');
            const count = textarea.value.length;
            document.getElementById('charCount' + index).textContent = count;
        }
        
        document.getElementById('examForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            const submitBtn = this.querySelector('.submit-btn');
            const originalText = submitBtn.textContent;
            
            try {
                submitBtn.textContent = 'Submitting...';
                submitBtn.disabled = true;
                
                const formData = new FormData(this);
                const answers = {};
                
                for (let [key, value] of formData.entries()) {
                    answers[key] = value;
                }
                
                const response = await fetch('/api/exams/submit/${exam._id}', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    },
                    body: JSON.stringify({ answers })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert('✅ Answers submitted successfully! Your score: ' + result.data.score + '/' + result.data.maxScore);
                    localStorage.removeItem('exam_${exam._id}_autosave');
                    window.location.href = '/dashboard';
                } else {
                    alert('❌ Error: ' + result.message);
                }
            } catch (error) {
                alert('❌ Network error. Please try again.');
                console.error('Submission error:', error);
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
        
        setInterval(() => {
            const formData = new FormData(document.getElementById('examForm'));
            const answers = {};
            
            for (let [key, value] of formData.entries()) {
                answers[key] = value;
            }
            
            localStorage.setItem('exam_${exam._id}_autosave', JSON.stringify({
                answers,
                timestamp: new Date().toISOString()
            }));
        }, 30000);
        
        window.addEventListener('load', () => {
            const saved = localStorage.getItem('exam_${exam._id}_autosave');
            if (saved) {
                const { answers, timestamp } = JSON.parse(saved);
                Object.keys(answers).forEach(key => {
                    const textarea = document.querySelector('[name="' + key + '"]');
                    if (textarea) {
                        textarea.value = answers[key];
                        updateCharCount(textarea);
                    }
                });
                console.log('Auto-saved answers loaded from:', new Date(timestamp).toLocaleString());
            }
        });
    </script>
</body>
</html>`;
}

module.exports = router;