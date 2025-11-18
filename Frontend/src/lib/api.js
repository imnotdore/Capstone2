// src/lib/api.js - COMPLETE FIXED VERSION WITH ANNOUNCEMENT FUNCTIONS
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

// Response interceptor for error handling
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
  const response = await api.get(`/exams/take/${examId}`);
  return response.data;
};

export const submitQuizAnswers = async (examId, answers) => {
  const response = await api.post(`/exams/${examId}/submit`, { answers });
  return response.data;
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

export const updateAnnouncement = async (announcementId, updateData) => {
  const response = await api.put(`/announcements/${announcementId}`, updateData);
  return response.data;
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