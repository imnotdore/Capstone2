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

const router = express.Router();

// ===== Helpers =====
const parsePDF = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const pdfData = await pdfParse(dataBuffer);
  const lines = pdfData.text.split("\n").filter(Boolean);
  return lines.map((line) => ({ type: "essay", question: line }));
};

const parseDOCX = async (filePath) => {
  const result = await mammoth.extractRawText({ path: filePath });
  const lines = result.value.split("\n").filter(Boolean);
  return lines.map((line) => ({ type: "essay", question: line }));
};

// ===== Multer setup =====
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// ===== Routes =====

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

// 2️⃣ Upload exam
router.post("/upload/:classId", auth, upload.single("file"), async (req, res) => {
  try {
    const { classId } = req.params;
    const { title, scheduledAt } = req.body;

    if (!req.file)
      return res.status(400).json({ success: false, message: "No file uploaded" });

    const cls = await Class.findById(classId);
    if (!cls) return res.status(404).json({ success: false, message: "Class not found" });
    if (cls.teacherId.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: "Not authorized" });

    let questions = [];
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (ext === ".pdf") questions = await parsePDF(req.file.path);
    else if (ext === ".docx") questions = await parseDOCX(req.file.path);

    const newExam = new Exam({
      title,
      fileUrl: `/uploads/${req.file.filename}`,
      classId,
      teacherId: req.user.id,
      scheduledAt,
      questions,
      isDeployed: false,
    });

    await newExam.save();
    cls.exams.push(newExam._id);
    await cls.save();

    res.json({
      success: true,
      message: "Exam uploaded successfully",
      data: {
        ...newExam._doc,
        fileUrl: `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`,
      },
    });
  } catch (err) {
    console.error("❌ Upload exam error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3️⃣ Get all exams for a class
router.get("/:classId", auth, async (req, res) => {
  try {
    const classId = new mongoose.Types.ObjectId(req.params.classId);
    const exams = await Exam.find({ classId });

    const updatedExams = exams.map((exam) => {
      const relativePath = exam.fileUrl.startsWith("/uploads")
        ? exam.fileUrl
        : `/uploads/${exam.fileUrl}`;
      return {
        ...exam._doc,
        fileUrl: `${req.protocol}://${req.get("host")}${relativePath}`,
      };
    });

    res.json({ success: true, message: "Exams fetched successfully", data: updatedExams });
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
    if (exam.teacherId.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: "Not authorized" });

    await Class.findByIdAndUpdate(exam.classId, { $pull: { exams: exam._id } });
    await exam.deleteOne();

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

    res.json({ success: true, message: "Questions fetched successfully", data: exam.questions });
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

    if (exam.teacherId.toString() !== req.user.id)
      return res.status(403).json({ success: false, message: "Not authorized to deploy this exam" });

    exam.isDeployed = true;
    await exam.save();

    res.json({ success: true, message: "Exam deployed successfully", data: exam });
  } catch (err) {
    console.error("❌ Deploy exam error:", err);
    res.status(500).json({ success: false, message: "Failed to deploy exam" });
  }
});

module.exports = router;