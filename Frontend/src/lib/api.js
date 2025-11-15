// src/lib/api.js - UPDATED WITH CLASSWORK FUNCTIONS
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

// ===== CLASSWORK API FUNCTIONS =====
export const getClasswork = async (classId) => {
  const response = await api.get(`/classwork/${classId}`);
  return response.data;
};

export const createClasswork = async (classId, classworkData) => {
  const response = await api.post(`/classwork/${classId}/create`, classworkData);
  return response.data;
};

export const deleteClasswork = async (classId, itemId) => {
  const response = await api.delete(`/classwork/${classId}/item/${itemId}`);
  return response.data;
};

export const updateClasswork = async (classId, itemId, updateData) => {
  const response = await api.put(`/classwork/${classId}/item/${itemId}`, updateData);
  return response.data;
};

export const getClassTopics = async (classId) => {
  const response = await api.get(`/classwork/${classId}/topics`);
  return response.data;
};

// ===== EXISTING CLASS FUNCTIONS =====
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

// ===== EXAM FUNCTIONS =====
export const getExams = async (classId) => {
  const response = await api.get(`/exams/${classId}`);
  return response.data;
};

export const uploadExam = async (classId, formData) => {
  const response = await api.post(`/exams/upload/${classId}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
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