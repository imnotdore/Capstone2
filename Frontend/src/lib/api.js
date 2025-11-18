// src/lib/api.js - COMPLETE FIXED VERSION
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
  withCredentials: true,
});

// Request interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ===== QUIZ/EXAM FUNCTIONS =====
export const createQuiz = async (classId, quizData) => {
  const response = await api.post(`/exams/create/${classId}`, quizData);
  return response.data;
};

export const updateQuiz = async (examId, quizData) => {
  const response = await api.put(`/exams/${examId}/quiz-questions`, quizData);
  return response.data;
};

export const getQuizForEdit = async (examId) => {
  const response = await api.get(`/exams/${examId}/edit`);
  return response.data;
};

export const deployExam = async (examId) => {
  const response = await api.patch(`/exams/deploy/${examId}`);
  return response.data;
};

// ===== REAL FILE UPLOAD & PARSE =====
export const uploadFileAndParse = async (formData) => {
  try {
    console.log('📁 REAL: Uploading file for parsing...');
    
    const response = await api.post('/exams/upload-parse', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('✅ File uploaded and parsed successfully:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('❌ File upload failed:', error);
    
    if (error.response?.status === 413) {
      throw new Error('File too large. Maximum size is 10MB.');
    } else if (error.response?.status === 400) {
      throw new Error(error.response.data?.message || 'Invalid file format.');
    } else if (error.response?.status === 403) {
      throw new Error('You are not authorized to upload files to this class.');
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else {
      throw new Error('Failed to process file. Please try again.');
    }
  }
};


export const getExams = async (classId) => {
  const response = await api.get(`/exams/${classId}`);
  return response.data;
};

export const getExamDetails = async (examId) => {
  const response = await api.get(`/exams/${examId}/details`);
  return response.data;
};

// ===== STUDENT QUIZ FUNCTIONS =====
export const getQuizForStudent = async (examId) => {
  try {
    console.log('🎯 Getting quiz for student, exam ID:', examId);
    
    const response = await api.get(`/exams/take/${examId}`);
    console.log('✅ Student quiz response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to get quiz for student:', error);
    
    // Better error handling
    if (error.response?.status === 404) {
      return {
        success: false,
        message: "Quiz not found. It may have been deleted or you don't have access."
      };
    } else if (error.response?.status === 403) {
      return {
        success: false,
        message: error.response.data?.message || "You don't have permission to access this quiz."
      };
    } else if (error.response?.data?.message) {
      return {
        success: false,
        message: error.response.data.message
      };
    } else {
      return {
        success: false,
        message: "Network error. Please check your connection and try again."
      };
    }
  }
};


// FIXED: Submit quiz answers function
export const submitQuizAnswers = async (examId, answers) => {
  try {
    console.log('📝 Submitting quiz answers for exam:', examId);
    
    const response = await api.post(`/exams/${examId}/submit`, { answers });
    console.log('✅ Quiz submission response:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('❌ Failed to submit quiz answers:', error);
    
    if (error.response?.data?.message) {
      return {
        success: false,
        message: error.response.data.message
      };
    } else {
      return {
        success: false,
        message: "Failed to submit answers. Please try again."
      };
    }
  }
};

// ===== INDIVIDUAL QUIZ DELETE =====
export const deleteQuiz = async (examId) => {
  const response = await api.delete(`/exams/${examId}`);
  return response.data;
};

// ===== DELETE ALL QUIZZES/FORMS =====
export const deleteAllQuizzes = async (classId) => {
  const response = await api.delete(`/exams/class/${classId}/delete-all`);
  return response.data;
};

// ===== CLASSWORK API FUNCTIONS =====
export const getClasswork = async (classId) => {
  try {
    const response = await api.get(`/classwork/${classId}`);
    return response.data;
  } catch (error) {
    console.log("Classwork endpoint not available, returning empty array");
    return { success: true, data: [] };
  }
};

export const createClasswork = async (classworkData) => {
  const response = await api.post("/classwork/create", classworkData);
  return response.data;
};

export const updateClasswork = async (classworkId, classworkData) => {
  const response = await api.put(`/classwork/${classworkId}`, classworkData);
  return response.data;
};

export const deleteClasswork = async (classworkId) => {
  const response = await api.delete(`/classwork/${classworkId}`);
  return response.data;
};

export const getClassTopics = async (classId) => {
  const response = await api.get(`/classwork/${classId}/topics`);
  return response.data;
};

// ===== ANNOUNCEMENT API FUNCTIONS =====
export const createAnnouncement = async (announcementData) => {
  const response = await api.post("/announcements", announcementData);
  return response.data;
};

export const getClassAnnouncements = async (classId) => {
  const response = await api.get(`/announcements/class/${classId}`);
  return response.data;
};

export const getAnnouncement = async (announcementId) => {
  const response = await api.get(`/announcements/${announcementId}`);
  return response.data;
};


// FIXED: Update announcement function with detailed debugging
export const updateAnnouncement = async (announcementId, updateData) => {
  try {
    console.log("🚀 API: updateAnnouncement CALLED");
    console.log("📦 Request Data:", {
      announcementId,
      updateData,
      url: `/announcements/${announcementId}`
    });

    const token = localStorage.getItem("token");
    console.log("🔑 Token exists:", !!token);

    const response = await api.put(`/announcements/${announcementId}`, updateData);
    
    console.log("✅ API Response SUCCESS:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ API Error updating announcement:", error);
    console.error("📡 Error Details:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    throw error;
  }
};

export const deleteAnnouncement = async (announcementId) => {
  const response = await api.delete(`/announcements/${announcementId}`);
  return response.data;
};

export const addCommentToAnnouncement = async (announcementId, commentData) => {
  const response = await api.post(`/announcements/${announcementId}/comments`, commentData);
  return response.data;
};

export const deleteCommentFromAnnouncement = async (announcementId, commentId) => {
  const response = await api.delete(`/announcements/${announcementId}/comments/${commentId}`);
  return response.data;
};

// ===== CLASS FUNCTIONS =====
export const getClassDetails = async (classId) => {
  const response = await api.get(`/class/${classId}`);
  return response.data;
};

export const getClassMembers = async (classId) => {
  const response = await api.get(`/class/${classId}/members`);
  return response.data;
};

export const createClass = async (classData) => {
  const response = await api.post('/class', classData);
  return response.data;
};

export const joinClass = async (classCode) => {
  const response = await api.post('/class/join', { code: classCode });
  return response.data;
};

export const getMyClasses = async () => {
  const response = await api.get('/class/my-classes');
  return response.data;
};

export const archiveClass = async (classId) => {
  const response = await api.put(`/class/${classId}/archive`);
  return response.data;
};

export const restoreClass = async (classId) => {
  const response = await api.put(`/class/${classId}/restore`);
  return response.data;
};

export const getArchivedClasses = async () => {
  const response = await api.get('/class/archived');
  return response.data;
};

export const unenrollFromClass = async (classId) => {
  const response = await api.delete(`/class/${classId}/unenroll`);
  return response.data;
};

// ===== AUTH FUNCTIONS =====
export const getAuthStatus = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

// ===== USER FUNCTIONS =====
export const getUserProfile = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

export const updateUserProfile = async (userData) => {
  const response = await api.put('/auth/profile', userData);
  return response.data;
};

// ===== FILE UPLOAD FUNCTIONS =====
export const uploadFile = async (file, classId) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('classId', classId);

  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const deleteFile = async (fileId) => {
  const response = await api.delete(`/upload/${fileId}`);
  return response.data;
};

// ===== SUBMISSION FUNCTIONS =====
export const submitAssignment = async (assignmentId, submissionData) => {
  const response = await api.post(`/assignments/${assignmentId}/submit`, submissionData);
  return response.data;
};

export const getSubmissions = async (assignmentId) => {
  const response = await api.get(`/assignments/${assignmentId}/submissions`);
  return response.data;
};

export const gradeSubmission = async (submissionId, gradeData) => {
  const response = await api.put(`/submissions/${submissionId}/grade`, gradeData);
  return response.data;
};

// ===== ANALYTICS FUNCTIONS =====
export const getClassAnalytics = async (classId) => {
  const response = await api.get(`/analytics/class/${classId}`);
  return response.data;
};

export const getExamAnalytics = async (examId) => {
  const response = await api.get(`/analytics/exam/${examId}`);
  return response.data;
};

// ===== NOTIFICATION FUNCTIONS =====
export const getNotifications = async () => {
  const response = await api.get('/notifications');
  return response.data;
};

export const markNotificationAsRead = async (notificationId) => {
  const response = await api.put(`/notifications/${notificationId}/read`);
  return response.data;
};

export const markAllNotificationsAsRead = async () => {
  const response = await api.put('/notifications/read-all');
  return response.data;
};


// src/lib/api.js - Idagdag ang mga sumusunod:
export const startExamSession = async (examId) => {
  try {
    const response = await api.post(`/exams/${examId}/start`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const endExamSession = async (examId) => {
  try {
    const response = await api.post(`/exams/${examId}/end`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const getExamSession = async (examId) => {
  try {
    const response = await api.get(`/exams/${examId}/session`);
    return response.data;
  } catch (error) {
    throw error;
  }
};
// ==============UPLOAD FILE TO=================//

