// src/pages/Dashboard.jsx - UPDATED WITH REACT ICONS
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaHome, FaCalendarAlt, FaArchive, FaCog, FaSignOutAlt, FaBook, FaUserPlus } from "react-icons/fa";
import api from "../lib/api";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ name: "Loading...", email: "" });
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [activeSidebar, setActiveSidebar] = useState("home"); // "home", "calendar", "archived", "settings"
  const [activeTab, setActiveTab] = useState("teaching"); // "teaching" or "enrolled"
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [className, setClassName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showCreateJoinDropdown, setShowCreateJoinDropdown] = useState(false);

  // Fetch user and classes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await api.get("/auth/me");
        setUser(userRes.data);

        const classesRes = await api.get("/class/my-classes");
        console.log("Classes response:", classesRes.data);
        setClasses(classesRes.data.data || classesRes.data);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
  }, []);

  // Create class
  const createClass = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/class", { name: className });
      const newClass = res.data.data || res.data;
      setClasses([...classes, { ...newClass, userRole: "teacher" }]);
      setClassName("");
      setShowCreateModal(false);
      alert("Class created successfully!");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create class");
    }
  };

  // Join class
  const joinClass = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/class/join", { code: joinCode });
      const joinedClass = res.data.data || res.data;
      setClasses([...classes, { ...joinedClass, userRole: "student" }]);
      setJoinCode("");
      setShowJoinModal(false);
      alert("Successfully joined class!");
    } catch (error) {
      alert(error.response?.data?.message || "Failed to join class");
    }
  };

  // Select class and fetch details
  const handleSelectClass = async (classData) => {
    setSelectedClass(classData);
    try {
      const examsRes = await api.get(`/exams/${classData._id}`);
      setExams(examsRes.data.data || examsRes.data);

      const membersRes = await api.get(`/class/${classData._id}/members`);
      setStudents(membersRes.data.data || membersRes.data);
    } catch (error) {
      console.error("Failed to fetch class details:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    window.location.href = "/login";
  };

  // Filter classes based on active tab
  const teachingClasses = classes.filter(c => c.userRole === "teacher");
  const enrolledClasses = classes.filter(c => c.userRole === "student");
  const displayedClasses = activeTab === "teaching" ? teachingClasses : enrolledClasses;

  // Render different content based on active sidebar
  const renderMainContent = () => {
    switch (activeSidebar) {
      case "home":
        return renderHomeContent();
      case "calendar":
        return renderCalendarContent();
      case "archived":
        return renderArchivedContent();
      case "settings":
        return renderSettingsContent();
      default:
        return renderHomeContent();
    }
  };

  const renderHomeContent = () => {
  if (selectedClass) {
    return (
      <div className="class-details">
        <div className="class-header">
          <button className="back-btn" onClick={() => setSelectedClass(null)}>
            ← Back to All Classes
          </button>
          <h2>{selectedClass.name}</h2>
          <p>Class Code: <strong>{selectedClass.code}</strong></p>
          <p>Your Role: <strong className={`role-text ${selectedClass.userRole}`}>
            {selectedClass.userRole === "teacher" ? "Teacher 👨‍🏫" : "Student 🎓"}
          </strong></p>
        </div>

        <div className="class-tabs">
          <button 
            className={activeTab === "classwork" ? "active" : ""}
            onClick={() => setActiveTab("classwork")}
          >
            Classwork
          </button>
          <button 
            className={activeTab === "people" ? "active" : ""}
            onClick={() => setActiveTab("people")}
          >
            People
          </button>
        </div>

        {/* Classwork Tab */}
        {activeTab === "classwork" && (
          <div className="classwork-tab">
            {selectedClass.userRole === "teacher" && (
              <div className="teacher-actions">
                <button className="primary-btn">
                  <FaPlus className="btn-icon" />
                  Create Assignment
                </button>
                <button className="primary-btn">
                  <FaPlus className="btn-icon" />
                  Upload Exam
                </button>
              </div>
            )}

            <div className="upcoming-work">
              <h3>Upcoming Work</h3>
              {exams.length === 0 ? (
                <p>No upcoming work.</p>
              ) : (
                <div className="work-list">
                  {exams.map((exam) => (
                    <div key={exam._id} className="work-item">
                      <div className="work-icon">📝</div>
                      <div className="work-info">
                        <h4>{exam.title}</h4>
                        <p>Due: {exam.scheduledAt ? new Date(exam.scheduledAt).toLocaleDateString() : "No due date"}</p>
                        <span className="work-class">{selectedClass.name}</span>
                      </div>
                      <div className="work-actions">
                        {selectedClass.userRole === "teacher" ? (
                          <button className="small-btn">View</button>
                        ) : (
                          <button className="primary-btn">Start</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* People Tab */}
{activeTab === "people" && (
  <div className="people-tab">
    <div className="people-header">
      <h3>Class Members</h3>
    </div>

    <div className="members-list">
      {/* Teacher List */}
      <div className="members-section">
        <h4 className="section-title">Teacher</h4>
        <div className="members-simple-list">
          {students
            .filter(member => member.role === "teacher")
            .map((teacher) => (
              <div key={teacher._id} className="member-simple-item teacher-item">
                <div className="member-simple-avatar">
                  <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.name)}&background=34a853&color=fff`}
                    alt={teacher.name}
                  />
                </div>
                <div className="member-simple-info">
                  <span className="member-simple-name">{teacher.name}</span>
                  {teacher._id === user._id && <span className="you-tag">You</span>}
                </div>
                <span className="member-simple-role">Teacher</span>
              </div>
            ))}
        </div>
      </div>

      {/* Students List */}
      <div className="members-section">
        <h4 className="section-title">
          Students ({students.filter(member => member.role === "student").length})
        </h4>
        <div className="members-simple-list">
          {students
            .filter(member => member.role === "student")
            .map((student) => (
              <div key={student._id} className="member-simple-item student-item">
                <div className="member-simple-avatar">
                  <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=4285f4&color=fff`}
                    alt={student.name}
                  />
                </div>
                <div className="member-simple-info">
                  <span className="member-simple-name">{student.name}</span>
                  {student._id === user._id && <span className="you-tag">You</span>}
                </div>
                <span className="member-simple-role">Student</span>
              </div>
            ))}
        </div>
      </div>

      {/* Empty State */}
      {students.length === 0 && (
        <div className="empty-members">
          <div className="empty-icon">👥</div>
          <h4>No members yet</h4>
          <p>When students join this class, they'll appear here.</p>
        </div>
      )}
    </div>
  </div>
)}
      </div>
    );
  }



    return (
      <div className="home-view">
        <div className="home-header">
        </div>
        
        {displayedClasses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <h3>No classes yet</h3>
            <p>
              {activeTab === "teaching" 
                ? "Create your first class to get started!" 
                : "Join a class to see it here!"}
            </p>
            <div className="empty-state-actions">
              {activeTab === "teaching" ? (
                <button 
                  className="primary-btn"
                  onClick={() => setShowCreateModal(true)}
                >
                  <FaPlus className="btn-icon" />
                  Create Your First Class
                </button>
              ) : (
                <button 
                  className="primary-btn"
                  onClick={() => setShowJoinModal(true)}
                >
                  <FaUserPlus className="btn-icon" />
                  Join a Class
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="class-grid">
            {displayedClasses.map((classData) => (
              <div 
                key={classData._id} 
                className="class-card"
                onClick={() => handleSelectClass(classData)}
              >
                <div className="class-card-header">
                  <h3>{classData.name}</h3>
                  <span className={`role-badge ${classData.userRole}`}>
                    {classData.userRole === "teacher" ? "Teacher" : "Student"}
                  </span>
                </div>
                <div className="class-card-content">
                  <p className="class-code">Class Code: <strong>{classData.code}</strong></p>
                  <p className="class-owner">Owner: {classData.ownerId?.name || "You"}</p>
                  <div className="class-stats">
                    <span>👥 {classData.members?.length || 1} members</span>
                    <span>📝 {classData.exams?.length || 0} exams</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCalendarContent = () => {
    return (
      <div className="calendar-view">
        <div className="calendar-header">
          <h2>Calendar</h2>
          <p>View your scheduled exams and assignments</p>
        </div>
        <div className="calendar-empty">
          <div className="empty-state-icon">📅</div>
          <h3>No upcoming events</h3>
          <p>When you have scheduled exams or assignments, they'll appear here.</p>
        </div>
      </div>
    );
  };

  const renderArchivedContent = () => {
    return (
      <div className="archived-view">
        <div className="archived-header">
          <h2>Archived Classes</h2>
          <p>View and restore your archived classes</p>
        </div>
        <div className="archived-empty">
          <div className="empty-state-icon">📦</div>
          <h3>No archived classes</h3>
          <p>When you archive classes, they'll appear here.</p>
        </div>
      </div>
    );
  };

  const renderSettingsContent = () => {
    return (
      <div className="settings-view">
        <div className="settings-header">
          <h2>Settings</h2>
          <p>Manage your account and notification preferences</p>
        </div>

        <div className="settings-sections">
          {/* Account Settings */}
          <div className="settings-section">
            <h3>Account settings</h3>
            <p className="settings-description">
              Change your password and security options, and access other services.
            </p>
            <div className="settings-item">
              <div className="settings-item-content">
                <h4>Change name</h4>
                <p>To change your name, go to your account settings.</p>
              </div>
              <button className="settings-btn">Manage</button>
            </div>
          </div>

          {/* Notifications */}
          <div className="settings-section">
            <h3>Notifications</h3>
            <p className="settings-description">
              These settings apply to the notifications you get by email.
            </p>

            <div className="notification-category">
              <h4>Comments</h4>
              <div className="notification-item">
                <span>Comments on your posts</span>
                <label className="toggle">
                  <input type="checkbox" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="notification-item">
                <span>Comments that mention you</span>
                <label className="toggle">
                  <input type="checkbox" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="notification-item">
                <span>Private comments on work</span>
                <label className="toggle">
                  <input type="checkbox" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="notification-category">
              <h4>Classes you're enrolled in</h4>
              <div className="notification-item">
                <span>Work and other posts from teachers</span>
                <label className="toggle">
                  <input type="checkbox" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="notification-item">
                <span>Returned work and grades from your teachers</span>
                <label className="toggle">
                  <input type="checkbox" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="notification-item">
                <span>Invitations to join classes as a student</span>
                <label className="toggle">
                  <input type="checkbox" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="notification-item">
                <span>Due-date reminders for your work</span>
                <label className="toggle">
                  <input type="checkbox" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
            </div>

            <div className="notification-category">
              <h4>Classes you teach</h4>
              <div className="notification-item">
                <span>Late submissions of student work</span>
                <label className="toggle">
                  <input type="checkbox" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="notification-item">
                <span>Resubmissions of student work</span>
                <label className="toggle">
                  <input type="checkbox" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="notification-item">
                <span>Invitations to co-teach classes</span>
                <label className="toggle">
                  <input type="checkbox" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="notification-item">
                <span>Scheduled post published or failed</span>
                <label className="toggle">
                  <input type="checkbox" defaultChecked />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-wrapper">
      {/* HEADER */}
      <header className="dashboard-header">
        <div className="header-left">
          <a href="/" className="logo">
            <span className="logo-icon">📚</span>
            <span>CAPSTONE NGANIII</span>
          </a>
        </div>

        <div className="header-right">
          <div className="plus-btn-container">
            <button 
              className="plus-btn"
              onClick={() => setShowCreateJoinDropdown(!showCreateJoinDropdown)}
            >
              <FaPlus className="plus-icon" />
            </button>
            {showCreateJoinDropdown && (
              <div className="create-join-dropdown">
                <button 
                  className="create-join-item"
                  onClick={() => {
                    setShowCreateModal(true);
                    setShowCreateJoinDropdown(false);
                  }}
                >
                  <FaBook className="create-join-icon" />
                  Create Class
                </button>
                <button 
                  className="create-join-item"
                  onClick={() => {
                    setShowJoinModal(true);
                    setShowCreateJoinDropdown(false);
                  }}
                >
                  <FaUserPlus className="create-join-icon" />
                  Join Class
                </button>
              </div>
            )}
          </div>

          <div className="user-profile">
            <button 
              className="user-profile-btn"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
            >
              <img 
                src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=203a43&color=fff`} 
                alt="User Avatar" 
                className="user-avatar" 
              />
            </button>
           {showUserDropdown && (
  <div className="user-dropdown">
    <div className="user-dropdown-header">
      <div className="user-info">
        <div className="user-name">{user.name}</div>
        <div className="user-email">{user.email}</div>
      </div>
    </div>
    <ul className="user-dropdown-menu">
      <li className="user-dropdown-item">
        <a 
          href="https://myaccount.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="user-dropdown-link"
          onClick={() => setShowUserDropdown(false)}
        >
          <FaCog className="user-dropdown-icon" />
          Manage your Google account
        </a>
      </li>
      <li className="user-dropdown-item">
        <hr className="user-dropdown-divider" />
      </li>
      <li className="user-dropdown-item">
        <button 
          className="user-dropdown-link"
          onClick={handleLogout}
          style={{ color: '#d93025' }}
        >
          <FaSignOutAlt className="user-dropdown-icon" />
          Logout
        </button>
      </li>
    </ul>
  </div>
)}
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="dashboard-main">
        {/* Sidebar */}
        <aside className="sidebar">
          <nav className="sidebar-nav">
            <button 
              className={`sidebar-item ${activeSidebar === 'home' ? 'active' : ''}`}
              onClick={() => setActiveSidebar('home')}
            >
              <FaHome className="sidebar-icon" />
              <span className="sidebar-text">Home</span>
            </button>
            
            <button 
              className={`sidebar-item ${activeSidebar === 'calendar' ? 'active' : ''}`}
              onClick={() => setActiveSidebar('calendar')}
            >
              <FaCalendarAlt className="sidebar-icon" />
              <span className="sidebar-text">Calendar</span>
            </button>
            
            <button 
              className={`sidebar-item ${activeSidebar === 'archived' ? 'active' : ''}`}
              onClick={() => setActiveSidebar('archived')}
            >
              <FaArchive className="sidebar-icon" />
              <span className="sidebar-text">Archived Classes</span>
            </button>
            
            <button 
              className={`sidebar-item ${activeSidebar === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveSidebar('settings')}
            >
              <FaCog className="sidebar-icon" />
              <span className="sidebar-text">Settings</span>
            </button>
          </nav>

          {/* Class List - Only show in Home view */}
          {activeSidebar === 'home' && (
            <div className="class-list-section">
              <div className="class-list-tabs">
                <button 
                  className={activeTab === "teaching" ? "active" : ""}
                  onClick={() => setActiveTab("teaching")} style={{ color: '#000000ff' }}
                >
                  👨‍🏫 Teaching ({teachingClasses.length})
                </button>
                <button 
                  className={activeTab === "enrolled" ? "active" : ""}
                  onClick={() => setActiveTab("enrolled")}  style={{ color: '#000000ff' }}
                >
                  🎓 Enrolled ({enrolledClasses.length})
                </button>
              </div>

              <div className="class-list">
                {displayedClasses.map((classData) => (
                  <div
                    key={classData._id}
                    className={`class-list-item ${selectedClass?._id === classData._id ? 'selected' : ''}`}
                    onClick={() => handleSelectClass(classData)} style={{ color: '#000000ff' }}
                  >
                    <div className="class-item-content">
                      <span className="class-name">{classData.name}</span>
                      <span className={`role-badge ${classData.userRole}`}>
                        {classData.userRole === "teacher" ? "👨‍🏫" : "🎓"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <div className="main-content">
          {renderMainContent()}
        </div>
      </main>

      {/* MODALS */}
      {showCreateModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Create New Class</h3>
            <form onSubmit={createClass}>
              <input
                type="text"
                placeholder="Class Name"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                required
              />
              <div className="modal-actions">
                <button type="submit" className="primary-btn">
                  <FaPlus className="btn-icon" />
                  Create
                </button>
                <button type="button" onClick={() => setShowCreateModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Join Class</h3>
            <form onSubmit={joinClass}>
              <input
                type="text"
                placeholder="Enter Class Code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                required
              />
              <div className="modal-actions">
                <button type="submit" className="primary-btn">
                  <FaUserPlus className="btn-icon" />
                  Join
                </button>
                <button type="button" onClick={() => setShowJoinModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}