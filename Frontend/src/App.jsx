// src/App.jsx - FIXED ROUTES
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ToDoPage from "./pages/ToDoPage";
import ReviewPage from "./pages/ReviewPage";
import ClassDetails from "./pages/ClassDetails";
import ExamRoomWrapper from "./pages/ExamRoomWrapper";
import ExamFormView from "./pages/ExamFormView";
import AuthSuccess from "./pages/AuthSuccess";
import QuizFormPage from "./pages/QuizFormPage";
import StudentQuizPage from "./pages/StudentQuizPage";
import TeacherExamSession from "./pages/TeacherExamSession"; // ✅ ADD MISSING IMPORT
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

        {/* Quiz Creation Routes */}
        <Route path="/class/:classId/quiz/new" element={
          <ProtectedRoute requiredRole="teacher">
            <QuizFormPage />
          </ProtectedRoute>
        } />

        <Route path="/class/:classId/quiz/:examId/edit" element={
          <ProtectedRoute requiredRole="teacher">
            <QuizFormPage />
          </ProtectedRoute>
        } />

        {/* Exam Room */}
        <Route path="/room/:roomId" element={
          <ProtectedRoute>
            <ExamRoomWrapper />
          </ProtectedRoute>
        } />

        {/* ✅ STUDENT QUIZ ACCESS ROUTE - FIXED */}
        <Route path="/exam/form/:examId" element={
          <ProtectedRoute>
            <ExamFormView />
          </ProtectedRoute>
        } />

        {/* ✅ SINGLE STUDENT QUIZ ROUTE - NO DUPLICATES */}
        <Route path="/student-quiz/:examId" element={
          <ProtectedRoute>
            <StudentQuizPage />
          </ProtectedRoute>
        } />

        {/* ✅ TEACHER EXAM SESSION ROUTE - NOW IMPORTED */}
        <Route path="/teacher-exam/:examId" element={
          <ProtectedRoute requiredRole="teacher">
            <TeacherExamSession />
          </ProtectedRoute>
        } />

        {/* ✅ CATCH ALL ROUTE - REDIRECT TO DASHBOARD */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;