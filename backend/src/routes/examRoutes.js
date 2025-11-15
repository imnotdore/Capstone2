const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const Exam = require("../models/Exam");
const Class = require("../models/Class"); // ✅ Fixed case sensitivity
const auth = require("../middleware/authMiddleware");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const axios = require("axios");
const FormData = require("form-data");
const { checkClassAccess, checkTeacherAccess } = require("../middleware/classAuth");

const router = express.Router();
console.log("🔧 Exam routes loaded - form route available at: /api/exams/form/:examId");

// ===== FILE PARSING FUNCTIONS (SAME) =====
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
            question: questionText,
            options: [],
            answer: ""
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
          question: line,
          options: [],
          answer: ""
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

// ===== MULTER SETUP (SAME) =====
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

// ===== UPDATED ROUTES WITH BETTER ERROR HANDLING =====

// ✅ Health check for exams
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Exam routes are working",
    routes: [
      "GET /form/:examId",
      "GET /deployed/:classId", 
      "POST /upload/:classId",
      "GET /:classId",
      "DELETE /:examId",
      "GET /:examId/questions",
      "PATCH /deploy/:examId",
      "PUT /:examId/questions"
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

    console.log("✅ Exam found:", exam.title, "Questions:", exam.questions.length);
    
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
router.get("/deployed/:classId", auth, checkClassAccess, async (req, res) => {
  try {
    const classId = new mongoose.Types.ObjectId(req.params.classId);
    const exam = await Exam.findOne({ classId, isDeployed: true });
    
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
router.post("/upload/:classId", auth, checkClassAccess, checkTeacherAccess, upload.single("file"), async (req, res) => {
  try {
    const { classId } = req.params;
    const { title, scheduledAt } = req.body;

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
        question: "No questions were automatically detected. Please manually add questions or check your file format.",
        options: [],
        answer: ""
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
router.get("/:classId", auth, checkClassAccess, async (req, res) => {
  try {
    const classId = new mongoose.Types.ObjectId(req.params.classId);
    const exams = await Exam.find({ classId }).sort({ createdAt: -1 });

    const updatedExams = exams.map((exam) => {
      const relativePath = exam.fileUrl.startsWith("/uploads")
        ? exam.fileUrl
        : `/uploads/${exam.fileUrl}`;
      return {
        ...exam._doc,
        fileUrl: `${req.protocol}://${req.get("host")}${relativePath}`,
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
      classData.members.some(m => m.userId.toString() === req.user.id)
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

// ✅ Deploy exam (TEACHER ONLY)
router.patch("/deploy/:examId", auth, async (req, res) => {
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
        message: "Not authorized to deploy this exam" 
      });
    }

    exam.isDeployed = true;
    await exam.save();

    res.json({ 
      success: true, 
      message: "Exam deployed successfully", 
      data: exam 
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

// ✅ Update questions (TEACHER ONLY)
router.put("/:examId/questions", auth, async (req, res) => {
  try {
    const { questions } = req.body;
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
        message: "Not authorized to update questions" 
      });
    }

    exam.questions = questions;
    await exam.save();

    res.json({ 
      success: true, 
      message: "Questions updated successfully", 
      data: exam.questions 
    });
  } catch (err) {
    console.error("❌ Update questions error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update questions",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ===== HELPER FUNCTIONS (SAME) =====
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
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="exam-title">${exam.title}</h1>
            <div class="exam-description">Please answer all questions below. Your responses will be saved automatically.</div>
        </div>
        
        <form id="examForm">
            ${exam.questions.map((question, index) => `
                <div class="question-card">
                    <div class="question-number">Question ${index + 1}</div>
                    <div class="question-text">${question.question}</div>
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
            const formData = new FormData(this);
            const answers = {};
            
            for (let [key, value] of formData.entries()) {
                answers[key] = value;
            }
            
            try {
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
                    alert('Answers submitted successfully!');
                    if (window.opener) {
                        window.close();
                    }
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                alert('Network error. Please try again.');
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