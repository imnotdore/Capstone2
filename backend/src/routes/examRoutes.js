const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const Exam = require("../models/Exam");
const Class = require("../models/class");
const auth = require("../middleware/authMiddleware");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const axios = require("axios");
const FormData = require("form-data");

const router = express.Router();
console.log("🔧 Exam routes loaded - form route available at: /api/exams/form/:examId");

// ===== IMPROVED FILE PARSING WITH PYTHON FALLBACK =====
const parsePDF = async (filePath) => {
  try {
    // Try Python service first
    try {
      const pythonResult = await callPythonService(filePath, 'pdf');
      if (pythonResult.questions && pythonResult.questions.length > 0) {
        return pythonResult.questions;
      }
    } catch (pyError) {
      console.log("Python service failed, using fallback:", pyError.message);
    }

    // Fallback to Node.js parsing
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    
    const questions = [];
    const text = pdfData.text;
    
    // Improved question detection
    const questionPatterns = [
      /\b\d+\.\s*(.+?\?)/g,                    // 1. Question?
      /\bQ\s*\d*\.?\s*(.+?\?)/g,               // Q1. Question?
      /\bQuestion\s*\d*:?\s*(.+?\?)/g,         // Question 1: Question?
      /([A-Z][^.!?]*\?)/g                      // Any sentence with ?
    ];
    
    for (const pattern of questionPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const questionText = match[1].trim();
        if (questionText.length > 10) { // Minimum length
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
    // Try Python service first
    try {
      const pythonResult = await callPythonService(filePath, 'docx');
      if (pythonResult.questions && pythonResult.questions.length > 0) {
        return pythonResult.questions;
      }
    } catch (pyError) {
      console.log("Python service failed, using fallback:", pyError.message);
    }

    // Fallback to Node.js parsing
    const result = await mammoth.extractRawText({ path: filePath });
    const questions = [];
    const lines = result.value.split('\n');
    
    lines.forEach(line => {
      line = line.trim();
      if (!line) return;
      
      // Enhanced question detection
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
    // Try Python service first for Excel
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

// ===== PYTHON SERVICE INTEGRATION =====
const callPythonService = async (filePath, fileType) => {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(filePath));
    
    const response = await axios.post('http://localhost:5001/process-file', formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 30000 // 30 seconds timeout
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
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// ===== ROUTES =====





router.get("/form/:examId", async (req, res) => {
  try {
    console.log("🎯 FORM ROUTE HIT for exam:", req.params.examId);
    const exam = await Exam.findById(req.params.examId);
    if (!exam) {
      console.log("❌ Exam not found:", req.params.examId);
      return res.status(404).json({ success: false, message: "Exam not found" });
    }

    console.log("✅ Exam found:", exam.title, "Questions:", exam.questions.length);
    
    // Generate Google Forms-like HTML
    const formHTML = generateFormHTML(exam);
    
    res.send(formHTML);

  } catch (err) {
    console.error("❌ Generate form error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


// 1️⃣ Get deployed exam for a class
router.get("/deployed/:classId", auth, async (req, res) => {
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
    return res.status(500).json({ success: false, message: err.message });
  }
});

// 2️⃣ Upload exam (ENHANCED WITH PYTHON)
router.post("/upload/:classId", auth, upload.single("file"), async (req, res) => {
  try {
    const { classId } = req.params;
    const { title, scheduledAt } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const cls = await Class.findById(classId);
    if (!cls) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: "Class not found" });
    }

    if (cls.teacherId.toString() !== req.user.id) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ success: false, message: "Not authorized" });
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
      // Clean up uploaded file on parsing error
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
      teacherId: req.user.id,
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
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error("❌ Upload exam error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3️⃣ Get all exams for a class
router.get("/:classId", auth, async (req, res) => {
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
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4️⃣ Delete exam
router.delete("/:examId", auth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });
    
    if (exam.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
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

    res.json({ success: true, message: "Exam deleted successfully" });
  } catch (err) {
    console.error("❌ Delete exam error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 5️⃣ Get parsed questions
router.get("/:examId/questions", auth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });

    res.json({ 
      success: true, 
      message: "Questions fetched successfully", 
      data: exam.questions 
    });
  } catch (err) {
    console.error("❌ Fetch questions error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 6️⃣ Deploy exam
router.patch("/deploy/:examId", auth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });

    if (exam.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized to deploy this exam" });
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
    res.status(500).json({ success: false, message: "Failed to deploy exam" });
  }
});



// 8️⃣ UPDATE QUESTIONS (NEW - Manual editing)
router.put("/:examId/questions", auth, async (req, res) => {
  try {
    const { questions } = req.body;
    const exam = await Exam.findById(req.params.examId);
    
    if (!exam) return res.status(404).json({ success: false, message: "Exam not found" });
    if (exam.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
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
    res.status(500).json({ success: false, message: err.message });
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
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f8f9fa;
            color: #202124;
            line-height: 1.6;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            background: white;
            border-radius: 8px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border-top: 4px solid #4285f4;
        }
        
        .exam-title {
            font-size: 24px;
            font-weight: 400;
            color: #202124;
            margin-bottom: 8px;
        }
        
        .exam-description {
            color: #5f6368;
            font-size: 14px;
        }
        
        .question-card {
            background: white;
            border-radius: 8px;
            padding: 25px;
            margin-bottom: 16px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.1);
            border: 1px solid #dadce0;
        }
        
        .question-number {
            font-size: 16px;
            color: #4285f4;
            font-weight: 500;
            margin-bottom: 8px;
        }
        
        .question-text {
            font-size: 16px;
            color: #202124;
            margin-bottom: 16px;
            font-weight: 400;
        }
        
        .answer-field {
            width: 100%;
            min-height: 120px;
            padding: 12px;
            border: 1px solid #dadce0;
            border-radius: 4px;
            font-family: inherit;
            font-size: 14px;
            resize: vertical;
            transition: border 0.2s;
        }
        
        .answer-field:focus {
            outline: none;
            border-color: #4285f4;
            box-shadow: 0 0 0 2px rgba(66, 133, 244, 0.2);
        }
        
        .submit-section {
            background: white;
            border-radius: 8px;
            padding: 25px;
            margin-top: 20px;
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .submit-btn {
            background: #4285f4;
            color: white;
            border: none;
            padding: 12px 32px;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.2s;
        }
        
        .submit-btn:hover {
            background: #3367d6;
        }
        
        .required {
            color: #d93025;
        }
        
        .char-count {
            font-size: 12px;
            color: #5f6368;
            text-align: right;
            margin-top: 4px;
        }
        
        .timer {
            background: #f8f9fa;
            border: 1px solid #dadce0;
            border-radius: 4px;
            padding: 10px 16px;
            font-size: 14px;
            color: #5f6368;
            display: inline-block;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="exam-title">${exam.title}</h1>
            <div class="exam-description">
                Please answer all questions below. Your responses will be saved automatically.
            </div>
        </div>
        
        <form id="examForm">
            ${exam.questions.map((question, index) => `
                <div class="question-card">
                    <div class="question-number">Question ${index + 1}</div>
                    <div class="question-text">${question.question}</div>
                    <textarea 
                        class="answer-field" 
                        name="q${index}" 
                        placeholder="Type your answer here..." 
                        oninput="updateCharCount(this)"
                    ></textarea>
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
        
        // Auto-save every 30 seconds
        setInterval(() => {
            const formData = new FormData(document.getElementById('examForm'));
            const answers = {};
            
            for (let [key, value] of formData.entries()) {
                answers[key] = value;
            }
            
            // Save to localStorage as backup
            localStorage.setItem('exam_${exam._id}_autosave', JSON.stringify({
                answers,
                timestamp: new Date().toISOString()
            }));
        }, 30000);
        
        // Load auto-saved answers
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