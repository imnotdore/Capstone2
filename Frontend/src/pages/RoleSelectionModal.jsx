// src/pages/RoleSelectionModal.jsx - UPDATED VERSION
import { useState } from "react";
import api from "../lib/api";
import "./RoleSelectionModal.css";

export default function RoleSelectionModal({ user, onRoleSelected }) {
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState("");
  const [error, setError] = useState("");

  const handleRoleSelect = async (role) => {
    setLoading(true);
    setSelectedRole(role);
    setError("");
    
    try {
      console.log("🎯 Selecting role:", role, "for user:", user._id);
      
      // Use the new role selection endpoint
      const response = await api.post("/auth/select-role", {
        role: role,
        userId: user._id
      });

      if (response.data.success) {
        console.log("✅ Role selection successful:", response.data.message);
        onRoleSelected(role);
      } else {
        throw new Error(response.data.message || "Failed to select role");
      }
    } catch (error) {
      console.error("❌ Role selection error:", error);
      setError(error.response?.data?.message || error.message || "Failed to select role");
      
      // Fallback: Still proceed to dashboard but show error
      setTimeout(() => {
        onRoleSelected(role);
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="role-modal-overlay">
      <div className="role-modal">
        {/* Header */}
        <div className="role-modal-header">
          <div className="welcome-icon"></div>
          <h2>Welcome to CAPSTONE, {user.name}!</h2>
          <p>Please choose your role</p>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="role-error-message">
            ⚠️ {error}
            <br />
            <small>Redirecting to dashboard...</small>
          </div>
        )}
        
        {/* Role Selection Cards */}
        <div className="role-selection">
          <button
            className={`role-card teacher ${selectedRole === "teacher" ? "selected" : ""}`}
            onClick={() => handleRoleSelect("teacher")}
            disabled={loading}
          >
            <h3>TEACHER</h3>
            <p>Create classes, manage students, and conduct exams</p>
           
            {loading && selectedRole === "teacher" && (
              <div className="role-loading">
                <div className="loading-spinner"></div>
                <span>Setting up teacher account...</span>
              </div>
            )}
          </button>

          <button
            className={`role-card student ${selectedRole === "student" ? "selected" : ""}`}
            onClick={() => handleRoleSelect("student")}
            disabled={loading}
          >
            <h3>STUDENT</h3>
            <p>Join classes, take exams, and submit assignments</p>
            
            {loading && selectedRole === "student" && (
              <div className="role-loading">
                <div className="loading-spinner"></div>
                <span>Setting up student account...</span>
              </div>
            )}
          </button>
        </div>

        {/* Footer Note */}
       
      </div>
    </div>
  );
}