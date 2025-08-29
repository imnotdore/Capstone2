import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import StudentDashboard from "./pages/StudentDashboard";
import ProtectedRoute from "./components/protectedroute";
import LandingPage from "./pages/LandingPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/student/dashboard" element={
          <ProtectedRoute> 
            <StudentDashboard/>
        </ProtectedRoute>} />

         
      </Routes>
    </Router>
  );
}

export default App;
