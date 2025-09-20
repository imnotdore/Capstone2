// routes/examRoutes.js
import express from "express";
import Exam from "../models/Exam.js";

const router = express.Router();

// GET exams for a class
router.get("/:classId", async (req, res) => {
  try {
    const { classId } = req.params;
    const exams = await Exam.find({ classId });

    // ✅ No need to add protocol/host kasi naka-save na absolute
    res.json(exams);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch exams" });
  }
});

export default router;
