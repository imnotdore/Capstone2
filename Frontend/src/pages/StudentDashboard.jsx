import { useState, useEffect } from "react";
import api from "../lib/api";
import "./StudentDashboard.css";

export default function StudentDashboard() {
  const [profile, setProfile] = useState({ name: "Loading...", avatar: null });
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [exams, setExams] = useState([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  // Fetch student profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await api.get("/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { name } = res.data;
        setProfile({
          name,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
            name
          )}&background=203a43&color=fff`,
        });
      } catch {
        setProfile({ name: "User", avatar: null });
      }
    };
    fetchProfile();
  }, []);

  // Fetch student classes
  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/student/classes", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClasses(res.data);
    } catch (err) {
      console.error("Failed to fetch classes", err);
      setClasses([]);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  // Join a class
  const joinClass = async (e) => {
    e.preventDefault();
    if (!joinCode) return alert("Enter class code");
    try {
      const token = localStorage.getItem("token");
      await api.post(
        "/class/join",
        { code: joinCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchClasses();
      setShowJoinModal(false);
      setJoinCode("");
    } catch (err) {
      console.error(err);
      alert("Failed to join class. Check the code.");
    }
  };

  // Select a class and fetch exams
  const handleSelectClass = async (c) => {
    setSelectedClass(c);
    try {
      const token = localStorage.getItem("token");
      const res = await api.get(`/exams/${c._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setExams(res.data);
    } catch (err) {
      console.error("Failed to fetch exams", err);
      setExams([]);
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
            {profile.avatar && <img src={profile.avatar} alt="avatar" />}
            <span>{profile.name}</span>
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

          {/* Home button */}
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
                      </div>
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
