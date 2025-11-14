// src/pages/RoleSelectionModal.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import "./RoleSelectionModal.css";

export default function RoleSelectionModal({ user, onClose }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");

  const handleRoleSelect = async (role) => {
    setLoading(true);
    setSelectedRole(role);
    
    try {
      // Update user role in backend
      await api.put("/auth/update-role", { role });
      
      // Store role in localStorage
      localStorage.setItem("userRole", role);
      
      // Redirect to dashboard
      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to update role:", error);
      // Still redirect but with default role
      localStorage.setItem("userRole", role);
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="role-modal-overlay">
      <div className="role-modal">
        <div className="role-modal-header">
          <h2>Welcome, {user.name}!</h2>
          <p>Please select your role to continue</p>
        </div>
        
        <div className="role-selection">
          <button
            className={`role-card ${selectedRole === "teacher" ? "selected" : ""}`}
            onClick={() => handleRoleSelect("teacher")}
            disabled={loading}
          >
            <div className="role-icon">👨‍🏫</div>
            <h3>TEACHER</h3>
            <p>Create and manage classes, assignments, and exams</p>
            <div className="role-features">
              <span>• Create classes</span>
              <span>• Manage students</span>
              <span>• Grade assignments</span>
            </div>
            {loading && selectedRole === "teacher" && (
              <div className="loading-spinner">⏳</div>
            )}
          </button>

          <button
            className={`role-card ${selectedRole === "student" ? "selected" : ""}`}
            onClick={() => handleRoleSelect("student")}
            disabled={loading}
          >
            <div className="role-icon">🎓</div>
            <h3>STUDENT</h3>
            <p>Join classes, submit assignments, and take exams</p>
            <div className="role-features">
              <span>• Join classes</span>
              <span>• Submit work</span>
              <span>• Take exams</span>
            </div>
            {loading && selectedRole === "student" && (
              <div className="loading-spinner">⏳</div>
            )}
          </button>
        </div>

        <div className="role-modal-note">
          <p>You can change this later in your profile settings</p>
        </div>
      </div>
    </div>
  );
}