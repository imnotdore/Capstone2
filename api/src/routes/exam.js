const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const auth = require("../middleware/authMiddleware");
const Exam = require("../models/Exam");
const Class = require("../models/class");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

// --- Helpers ---

// Parse PDF into questions
const parsePDF = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer);
  const lines = pdfData.text.split("\n").filter(Boolean);
  return lines.map((line) => ({ type: "essay", question: line }));
};

// Parse DOCX into questions
const parseDOCX = async (filePath) => {
  const result = await mammoth.extractRawText({ path: filePath });
  const lines = result.value.split("\n").filter(Boolean);
  return lines.map((line) => ({ type: "essay", question: line }));
};

// --- Multer setup ---
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});

const upload = multer({ storage });

// --- Routes ---

// --- Upload exam ---
router.post("/upload/:classId", auth, upload.single("file"), async (req, res) => {
  try {
    const { classId } = req.params;
    const { title, scheduledAt } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // 🟢 Debug logs
    console.log("✅ File uploaded!");
    console.log("📂 Saved at (absolute path):", req.file.path);
    console.log("🌐 Accessible URL:", `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`);

    const cls = await Class.findById(classId);
    if (!cls) return res.status(404).json({ message: "Class not found" });
    if (cls.teacherId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // --- Parse file into questions ---
    let questions = [];
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext === ".pdf") {
      questions = await parsePDF(req.file.path);
    } else if (ext === ".docx") {
      questions = await parseDOCX(req.file.path);
    }

    const newExam = new Exam({
      title,
      fileUrl: `/uploads/${req.file.filename}`, // relative path
      classId,
      teacherId: req.user.id,
      scheduledAt,
      questions, // save parsed questions
    });

    await newExam.save();
    cls.exams.push(newExam._id);
    await cls.save();

    res.json({
      ...newExam._doc,
      fileUrl: `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`, // absolute for frontend
    });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ message: err.message });
  }
});


// Get exams for a class
router.get("/:classId", auth, async (req, res) => {
  try {
    const exams = await Exam.find({ classId: req.params.classId });

    const updatedExams = exams.map((exam) => {
      const relativePath = exam.fileUrl.startsWith("/uploads")
        ? exam.fileUrl
        : `/uploads/${exam.fileUrl}`;
      return {
        ...exam._doc,
        fileUrl: `${req.protocol}://${req.get("host")}${relativePath}`,
      };
    });

    res.json(updatedExams);
  } catch (err) {
    console.error("❌ Fetch exams error:", err);
    res.status(500).json({ message: err.message });
  }
});


// Delete exam
router.delete("/:examId", auth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    if (exam.teacherId.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });

    await exam.deleteOne();
    res.json({ message: "Exam deleted successfully" });
  } catch (err) {
    console.error("❌ Delete exam error:", err);
    res.status(500).json({ message: err.message });
  }
});

// Get parsed questions
router.get("/:examId/questions", auth, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    res.json(exam.questions || []);
  } catch (err) {
    console.error("❌ Fetch questions error:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
