// middleware/classAuth.js - NEW FILE
const Class = require("../models/class");

const checkClassAccess = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const userId = req.user.id;

    const classData = await Class.findById(classId);
    if (!classData) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Check if user is owner
    if (classData.ownerId.toString() === userId) {
      req.user.classRole = "teacher";
      req.classData = classData;
      return next();
    }

    // Check if user is member
    const member = classData.members.find(m => m.userId.toString() === userId);
    if (member) {
      req.user.classRole = member.role;
      req.classData = classData;
      return next();
    }

    return res.status(403).json({ message: "Not enrolled in this class" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const checkTeacherAccess = async (req, res, next) => {
  if (req.user.classRole !== "teacher") {
    return res.status(403).json({ message: "Teacher access required" });
  }
  next();
};

module.exports = { checkClassAccess, checkTeacherAccess };