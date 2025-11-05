import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import "./StudentDashboard.css";

export default function StudentDashboard() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState({ name: "Loading...", avatar: null });
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [exams, setExams] = useState([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  // Fetch student profile
  // ✅ FIXED: Fetch student profile with more data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        console.log("🔄 Fetching user profile...");
        
        const res = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        console.log("✅ Profile API Response:", res.data); // Debug line
        
        const userData = res.data;
        
        // Extract user information
        const userName = userData.name || "User";
        const userEmail = userData.email || "";
        
        setProfile({
          name: userName,
          email: userEmail,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
            userName
          )}&background=203a43&color=fff&size=128`,
        });
        
        console.log("📋 Profile set:", { name: userName, email: userEmail });
        
      } catch (error) {
        console.error("❌ Failed to fetch profile:", error);
        setProfile({ 
          name: "User", 
          email: "",
          avatar: null 
        });
      }
    };
    fetchProfile();
  }, []);

  // Fetch student classes
  // Fetch student classes
const fetchClasses = async () => {
  try {
    const token = localStorage.getItem("token");
    const res = await api.get("/student/classes", {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    // I-adjust base sa response structure
    const classesData = Array.isArray(res.data) 
      ? res.data 
      : (res.data?.data || []);
    
    setClasses(classesData);
  } catch (err) {
    console.error("Failed to fetch classes", err);
    setClasses([]);
  }
};

  useEffect(() => {
    fetchClasses();
  }, []);

  // Join a class
 // Join a class
const joinClass = async (e) => {
  e.preventDefault();
  if (!joinCode) return alert("Enter class code");
  try {
    const token = localStorage.getItem("token");
    const res = await api.post(
      "/class/join",
      { code: joinCode },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    // Check kung successful ang join
    if (res.data.success || res.data.message) {
      fetchClasses();
      setShowJoinModal(false);
      setJoinCode("");
      alert("Successfully joined class!");
    } else {
      alert("Failed to join class. Please check the code.");
    }
  } catch (err) {
    console.error(err);
    alert(err.response?.data?.message || "Failed to join class. Check the code.");
  }
};

  // Select a class and fetch exams
// Select a class and fetch exams
const handleSelectClass = async (c) => {
  setSelectedClass(c);

  try {
    const token = localStorage.getItem("token");

    // 1️⃣ Fetch all exams for the class
    const res = await api.get(`/exams/${c._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("Exams API Response:", res); // Debug log

    // I-adjust base sa actual na response structure
    let examsData = [];
    
    if (Array.isArray(res.data)) {
      // Kung direktang array ang response
      examsData = res.data;
    } else if (res.data && Array.isArray(res.data.data)) {
      // Kung { success: true, data: [], message: "" }
      examsData = res.data.data;
    } else if (res.data && res.data.success && Array.isArray(res.data.data)) {
      // Kung { data: [] } structure
      examsData = res.data.data;
    }

    let normalizedExams = examsData.map((exam) => ({
      ...exam,
      _id: exam._id ? exam._id.toString() : exam.id?.toString(),
      isDeployed: false,
      roomId: null,
    }));

    // 2️⃣ Fetch deployed exam safely
    try {
      const deployedRes = await api.get(`/exams/deployed/${c._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Deployed Exam Response:", deployedRes); // Debug log

      let deployedExam = null;
      
      // I-adjust base sa response structure
      if (deployedRes.data && deployedRes.data.data) {
        deployedExam = deployedRes.data.data;
      } else if (deployedRes.data && deployedRes.data.success) {
        deployedExam = deployedRes.data.data;
      } else {
        deployedExam = deployedRes.data;
      }

      if (deployedExam) {
        const deployedExamId = deployedExam._id?.toString() || deployedExam.id?.toString();
        
        if (deployedExamId) {
          normalizedExams = normalizedExams.map((exam) =>
            exam._id === deployedExamId
              ? {
                  ...exam,
                  isDeployed: true,
                  roomId: `exam-${deployedExamId}`,
                }
              : exam
          );
        }
      }
    } catch (err) {
      console.warn("No deployed exam found or error fetching it.", err);
    }

    setExams(normalizedExams);
  } catch (err) {
    console.error("Failed to fetch exams", err);
    setExams([]);
  }
};





  // Take Exam / Join Exam Room
 // Take Exam / Join Exam Room
const joinExam = async (roomId) => {
  const studentName = profile.name || "Student";
  let studentId = localStorage.getItem("studentId");
  if (!studentId) {
    studentId = Date.now().toString();
    localStorage.setItem("studentId", studentId);
  }

  try {
    console.log("Requesting camera and microphone access...");
    
    // Mas specific na constraints
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 15 }
      }, 
      audio: {
        echoCancellation: true,
        noiseSuppression: true
      } 
    });
    
    console.log("✅ Camera and microphone access granted");
    
    // Important: Immediately stop the stream after testing
    stream.getTracks().forEach(track => track.stop());
    
    // Proceed to exam room
    navigate(`/room/${roomId}`, {
      state: { studentName, studentId, className: selectedClass?.name },
    });
    
  } catch (err) {
    console.error("❌ Camera/microphone access failed:", err);
    
    // More specific error messages
    if (err.name === 'NotAllowedError') {
      alert("❌ Camera and microphone permission was denied. Please allow camera and microphone access in your browser settings and try again.");
    } else if (err.name === 'NotFoundError') {
      alert("❌ No camera or microphone found. Please check if your device has working camera and microphone.");
    } else if (err.name === 'NotReadableError') {
      alert("❌ Camera or microphone is already in use by another application. Please close other apps using your camera/microphone.");
    } else {
      alert(`❌ Cannot access camera and microphone: ${err.message}`);
    }
  }
};

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <div className="dashboard-wrapper">
      {/* HEADER */}

      <header className="dashboard-header">
        <h1 className="logo">Student Dashboard</h1>
        <div className="header-right">
          <div className="profile">
            {profile.avatar && (
              <img src={profile.avatar} alt="avatar" className="profile-avatar" />
            )}
            <div className="profile-info">
              <span className="profile-name">{profile.name}</span>
              {profile.email && (
                <span className="profile-email">{profile.email}</span>
              )}
            </div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="dashboard-main">
        {/* Sidebar */}
        <aside className="sidebar">
          <h2>📚 My Classes</h2>
          <button
            className="primary-btn"
            onClick={() => setShowJoinModal(true)}
          >
            + Join Class
          </button>

          <ul className="class-list">
            <li
              onClick={() => setSelectedClass(null)}
              className={!selectedClass ? "selected" : ""}
            >
              🏠 Home
            </li>
            {classes.length === 0 ? (
              <li>No classes yet.</li>
            ) : (
              classes.map((c) => (
                <li
                  key={c._id}
                  onClick={() => handleSelectClass(c)}
                  className={selectedClass?._id === c._id ? "selected" : ""}
                >
                  {c.name}{" "}
                  {c.examsCount > 0 && (
                    <span className="notif-badge">🔔 {c.examsCount}</span>
                  )}
                </li>
              ))
            )}
          </ul>
        </aside>

        {/* Main content */}
        <div className="main-content">
          {!selectedClass ? (
            <div className="class-grid">
              {classes.length === 0 ? (
                <p>No classes joined yet.</p>
              ) : (
                classes.map((c) => (
                  <div
                    key={c._id}
                    className="class-card"
                    onClick={() => handleSelectClass(c)}
                  >
                    <h3>📘 {c.name}</h3>
                    <p>Code: {c.code}</p>
                    {c.examsCount > 0 && (
                      <span className="notif-badge">
                        🔔 {c.examsCount} Exam(s)
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <>
              <h3>{selectedClass.name}</h3>
              <p>
                Class Code: <strong>{selectedClass.code}</strong>
              </p>

              <h4>Exams</h4>
              {exams.length === 0 ? (
                <p>No exams yet.</p>
              ) : (
                <div className="exam-list">
                  {exams.map((exam) => (
                    <div className="exam-item" key={exam._id}>
                      <div className="exam-info">
                        <h3>{exam.title}</h3>
                        <p>
                          📅{" "}
                          {exam.scheduledAt
                            ? new Date(exam.scheduledAt).toLocaleString()
                            : "No schedule"}
                        </p>
                        <p>
                          Status:{" "}
                          {exam.isDeployed ? (
                            <span className="deployed">✅ Deployed</span>
                          ) : (
                            <span className="not-deployed">Pending</span>
                          )}
                        </p>
                      </div>
                     {exam.isDeployed && exam.roomId ? (
  new Date(exam.scheduledAt) <= new Date() ? (
    <button
      className="primary-btn"
      onClick={() => joinExam(exam.roomId)}
    >
      Take Exam
    </button>
  ) : (
    <button className="primary-btn" disabled>
      Scheduled: {new Date(exam.scheduledAt).toLocaleString()}
    </button>
  )
) : (
  <button className="primary-btn" disabled>
    Pending
  </button>
)}

                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Join Class Modal */}
      {showJoinModal && (
        <div className="modal">
          <div className="modal-content" style={{ maxWidth: "400px" }}>
            <h3>Join Class</h3>
            <form onSubmit={joinClass}>
              <input
                type="text"
                placeholder="Enter Class Code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
              />
              <div className="modal-actions">
                <button type="submit" className="primary-btn">
                  Join
                </button>
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
