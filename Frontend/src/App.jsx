import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import ClassDetails from "./pages/ClassDetails";
import ExamRoomWrapper from "./pages/ExamRoomWrapper"; // bagong wrapper component

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* Student Dashboard (student only) */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        {/* Teacher Dashboard (teacher only) */}
        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />

        {/* Teacher Class Details (teacher only) */}
        <Route
          path="/teacher/class/:id"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <ClassDetails />
            </ProtectedRoute>
          }
        />

        {/* Exam Room (teacher & student) */}
        <Route
          path="/room/:roomId"
          element={
            <ProtectedRoute allowedRoles={["teacher", "student"]}>
              <ExamRoomWrapper />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
