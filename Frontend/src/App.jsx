// src/App.jsx - UPDATED WITH ROLE PROTECTION
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ToDoPage from "./pages/ToDoPage";
import ReviewPage from "./pages/ReviewPage";
import ClassDetails from "./pages/ClassDetails";
import ExamRoomWrapper from "./pages/ExamRoomWrapper";
import ExamFormView from "./pages/ExamformView";
import AuthSuccess from "./pages/AuthSuccess";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <Routes>
        {/* ✅ DEFAULT ROUTE REDIRECTS TO LOGIN */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        
        {/* Public routes */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/success" element={<AuthSuccess />} />

        {/* ✅ SINGLE DASHBOARD FOR ALL USERS */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        {/* ✅ TO DO PAGE - STUDENTS ONLY */}
        <Route path="/todo" element={
          <ProtectedRoute requiredRole="student">
            <ToDoPage />
          </ProtectedRoute>
        } />

        {/* ✅ REVIEW PAGE - TEACHERS ONLY */}
        <Route path="/review" element={
          <ProtectedRoute requiredRole="teacher">
            <ReviewPage />
          </ProtectedRoute>
        } />

        {/* Class details */}
        <Route path="/class/:id" element={
          <ProtectedRoute>
            <ClassDetails />
          </ProtectedRoute>
        } />

        {/* Exam Room */}
        <Route path="/room/:roomId" element={
          <ProtectedRoute>
            <ExamRoomWrapper />
          </ProtectedRoute>
        } />

        {/* Exam Form */}
        <Route path="/exam/form/:examId" element={
          <ProtectedRoute>
            <ExamFormView />
          </ProtectedRoute>
        } />

        {/* ✅ CATCH ALL ROUTE - REDIRECT TO LOGIN */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;