import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // dynamic base URL
  withCredentials: true, // allow cookies / JWT
});

// Automatically attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
