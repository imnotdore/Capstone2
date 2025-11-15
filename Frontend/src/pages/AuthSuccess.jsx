import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../lib/api";
import RoleSelectionModal from "./RoleSelectionModal";

export default function AuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    
    console.log("Token from URL:", token);
    
    if (!token) {
      console.log("No token found, redirecting to login");
      navigate("/login");
      return;
    }

    // Store token immediately
    localStorage.setItem("token", token);
    console.log("Token stored in localStorage");
    
    // Fetch user data and check role status
    const fetchUserAndCheckRole = async () => {
      try {
        console.log("Fetching user data from /auth/me...");
        const userRes = await api.get("/auth/me");
        const userData = userRes.data;
        
        console.log("FULL USER RESPONSE:", userData);
        
        setUser(userData);
        
        // CRITICAL DEBUG INFO
        console.log("ROLE CHECK ANALYSIS:");
        console.log("   - User email:", userData.email);
        console.log("   - Role from API:", userData.role);
        console.log("   - hasSelectedRole from API:", userData.hasSelectedRole);
        console.log("   - Stored role in localStorage:", localStorage.getItem('userRole'));
        console.log("   - Should show modal?", !userData.hasSelectedRole || !userData.role);

        // Check if user needs to select role
        if (!userData.hasSelectedRole || !userData.role) {
          console.log("SHOWING ROLE SELECTION MODAL");
          console.log("   Reason: hasSelectedRole is false OR role is null/undefined");
          setShowRoleModal(true);
        } else {
          console.log("SKIPPING ROLE SELECTION - REDIRECTING TO DASHBOARD");
          console.log("   Reason: User already has role:", userData.role);
          console.log("   hasSelectedRole:", userData.hasSelectedRole);
          
          // User already has role, proceed to dashboard
          localStorage.setItem("userRole", userData.role);
          localStorage.setItem("userName", userData.name);
          navigate("/dashboard");
        }
      } catch (err) {
        console.error("FAILED TO FETCH USER:", err);
        console.error("Error details:", err.response?.data);
        setError("Failed to load user information: " + (err.response?.data?.message || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndCheckRole();
  }, [navigate, searchParams]);

  const handleRoleSelected = (role) => {
    console.log("Role selected:", role);
    localStorage.setItem("userRole", role);
    localStorage.setItem("userName", user.name);
    setShowRoleModal(false);
    navigate("/dashboard");
  };

  // TEMPORARY: Force show modal for testing
  const forceShowModal = () => {
    console.log("FORCING MODAL TO SHOW");
    setShowRoleModal(true);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        textAlign: 'center',
        flexDirection: 'column'
      }}>
        <div>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ fontSize: '1.2rem', margin: 0 }}>Loading your account...</p>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '10px' }}>Check browser console for debug info</p>
        </div>
        
        {/* TEMPORARY DEBUG BUTTON */}
        <button 
          onClick={forceShowModal}
          style={{
            marginTop: '20px',
            background: 'rgba(255,255,255,0.2)',
            color: 'white',
            border: '1px solid white',
            padding: '10px 20px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          DEBUG: Force Show Role Modal
        </button>
        
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          padding: '40px',
          borderRadius: '12px',
          textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          maxWidth: '400px',
          width: '100%'
        }}>
          <h2 style={{ color: '#e53e3e', marginBottom: '16px' }}>Error</h2>
          <p style={{ color: '#718096', marginBottom: '24px' }}>{error}</p>
          <button 
            onClick={() => navigate("/login")}
            style={{
              background: '#4299e1',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      {/* Role Selection Modal */}
      {showRoleModal && user && (
        <RoleSelectionModal 
          user={user}
          onRoleSelected={handleRoleSelected}
        />
      )}
      
      {/* Loading state while processing */}
      {!showRoleModal && (
        <div style={{
          textAlign: 'center',
          color: 'white'
        }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid rgba(255, 255, 255, 0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ fontSize: '1.2rem', margin: 0 }}>Setting up your account...</p>
          <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '10px' }}>
            If stuck, use the debug button above
          </p>
        </div>
      )}
    </div>
  );
}