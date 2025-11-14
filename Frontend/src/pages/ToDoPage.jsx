// src/pages/ToDoPage.jsx - GOOGLE CLASSROOM STYLE
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaHome, FaCalendarAlt, FaArchive, FaCog, FaSignOutAlt, FaBars, FaChevronLeft } from "react-icons/fa";
import api from "../lib/api";
import "./Dashboard.css";

export default function ToDoPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ name: "Loading...", email: "" });
  const [assignments, setAssignments] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("missing"); // "missing" or "done"

  // Fetch user data and check role
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await api.get("/auth/me");
        setUser(userRes.data);
        setUserRole(userRes.data.role);

        // ✅ CHECK IF USER IS STUDENT
        if (userRes.data.role !== "student") {
          alert("This page is for students only.");
          navigate('/dashboard');
          return;
        }

        // Fetch all assignments
        await fetchStudentAssignments();
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [navigate]);

  // Fetch assignments for student - UPDATED WITH GOOGLE CLASSROOM DATA
  const fetchStudentAssignments = async () => {
    try {
      // Get all classes the student is enrolled in
      const classesRes = await api.get("/class/my-classes");
      const enrolledClasses = classesRes.data.data || classesRes.data;
      
      // Fetch assignments from all enrolled classes
      const allAssignments = [];
      for (const classData of enrolledClasses) {
        try {
          const examsRes = await api.get(`/exams/${classData._id}`);
          const classExams = examsRes.data.data || examsRes.data;
          
          // Transform exams to Google Classroom style assignments
          const classAssignments = classExams.map(exam => ({
            _id: exam._id,
            title: exam.title,
            className: classData.name,
            teacherName: classData.ownerId?.name || "PERSON", // Default to "PERSON"
            postedDate: exam.createdAt ? new Date(exam.createdAt) : new Date('2025-11-10'), // Use creation date or default
            dueDate: exam.scheduledAt ? new Date(exam.scheduledAt) : null,
            status: Math.random() > 0.5 ? "missing" : "done", // Mock status for demo
            isDeployed: exam.isDeployed,
            type: "exam"
          }));
          
          allAssignments.push(...classAssignments);
        } catch (error) {
          console.error(`Failed to fetch assignments for class ${classData.name}:`, error);
        }
      }
      
      setAssignments(allAssignments);
    } catch (error) {
      console.error("Failed to fetch student assignments:", error);
      // Use mock data matching Google Classroom screenshot
      setAssignments([
        {
          _id: '1',
          title: 'hello',
          className: 'STEARCH',
          teacherName: 'PERSON',
          postedDate: new Date('2025-11-10'),
          dueDate: null,
          status: 'missing',
          isDeployed: true,
          type: 'assignment'
        },
        {
          _id: '2',
          title: 'answer this',
          className: 'STEARCH',
          teacherName: 'PERSON',
          postedDate: new Date('2025-11-10'),
          dueDate: null,
          status: 'missing',
          isDeployed: true,
          type: 'assignment'
        },
        {
          _id: '3',
          title: 'hi',
          className: 'STEARCH',
          teacherName: 'PERSON',
          postedDate: new Date('2025-11-10'),
          dueDate: null,
          status: 'missing',
          isDeployed: true,
          type: 'assignment'
        },
        {
          _id: '4',
          title: 'Math Quiz',
          className: 'Mathematics',
          teacherName: 'Dr. Smith',
          postedDate: new Date('2025-11-08'),
          dueDate: new Date('2025-11-15'),
          status: 'done',
          isDeployed: true,
          type: 'exam'
        },
        {
          _id: '5',
          title: 'Science Report',
          className: 'Science',
          teacherName: 'Prof. Johnson',
          postedDate: new Date('2025-11-09'),
          dueDate: new Date('2025-11-22'),
          status: 'missing',
          isDeployed: true,
          type: 'assignment'
        }
      ]);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    window.location.href = "/login";
  };

  // Filter assignments based on active tab
  const filteredAssignments = assignments.filter(assignment => 
    activeTab === "missing" ? assignment.status === "missing" : assignment.status === "done"
  );

  // Categorize assignments by due date
  const categorizeAssignments = (assignments) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + 7);
    
    const startOfNextWeek = new Date(endOfWeek);
    startOfNextWeek.setDate(endOfWeek.getDate() + 1);
    
    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 7);

    const noDueDate = assignments.filter(assignment => !assignment.dueDate);
    const thisWeek = assignments.filter(assignment => {
      if (!assignment.dueDate) return false;
      const dueDate = new Date(assignment.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= today && dueDate <= endOfWeek;
    });
    const nextWeek = assignments.filter(assignment => {
      if (!assignment.dueDate) return false;
      const dueDate = new Date(assignment.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate >= startOfNextWeek && dueDate <= endOfNextWeek;
    });
    const later = assignments.filter(assignment => {
      if (!assignment.dueDate) return false;
      const dueDate = new Date(assignment.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate > endOfNextWeek;
    });

    return { noDueDate, thisWeek, nextWeek, later };
  };

  const { noDueDate, thisWeek, nextWeek, later } = categorizeAssignments(filteredAssignments);

  const formatPostedDate = (date) => {
    const postedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (postedDate.toDateString() === today.toDateString()) {
      return 'Posted today';
    } else if (postedDate.toDateString() === yesterday.toDateString()) {
      return 'Posted yesterday';
    } else {
      return `Posted ${postedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      })}`;
    }
  };

  // Assignment Card Component - Google Classroom Style
  const AssignmentCard = ({ assignment, index }) => {
    return (
      <div className="assignment-card">
        <div className="assignment-number">{index + 1}</div>
        <div className="assignment-content">
          <div className="assignment-header">
            <h4 className="assignment-title">{assignment.title}</h4>
            <div className="assignment-meta">
              <span className="teacher-name">{assignment.teacherName}</span>
              <span className="posted-date">{formatPostedDate(assignment.postedDate)}</span>
            </div>
          </div>
          <div className="assignment-class">{assignment.className}</div>
        </div>
        <div className="assignment-actions">
          <button 
            className={`action-btn ${assignment.status === 'done' ? 'done' : 'start'}`}
            onClick={() => {
              if (assignment.isDeployed && assignment.type === 'exam') {
                window.open(`/exam/form/${assignment._id}`, '_blank');
              } else {
                alert('This assignment is not yet available.');
              }
            }}
          >
            {assignment.status === 'done' ? 'Review' : 'Start'}
          </button>
        </div>
      </div>
    );
  };

  // Assignment Section Component
  const AssignmentSection = ({ title, assignments, defaultOpen = true }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    if (assignments.length === 0) return null;

    return (
      <div className="assignment-section">
        <div className="section-header" onClick={() => setIsOpen(!isOpen)}>
          <h3 className="section-title">{title}</h3>
          <span className={`toggle-arrow ${isOpen ? 'open' : ''}`}>
            <FaChevronLeft />
          </span>
        </div>
        {isOpen && (
          <div className="assignment-list">
            {assignments.map((assignment, index) => (
              <AssignmentCard key={assignment._id} assignment={assignment} index={index} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Show loading or redirect if not student
  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (userRole !== "student") {
    return (
      <div className="access-denied">
        <h2>Access Denied</h2>
        <p>This page is for students only.</p>
        <button onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      {/* HEADER */}
      <header className="dashboard-header">
        <div className="header-left">
          <button 
            className="hamburger-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <FaBars className="hamburger-icon" />
          </button>
          <button 
            className="back-btn"
            onClick={() => navigate('/dashboard')}
          >
            <FaChevronLeft className="back-icon" />
            Back 
          </button>
          <a href="/" className="logo">
            <span>CAPSTONE</span>
          </a>
        </div>

        <div className="header-right">
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
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <nav className="sidebar-nav">
            <button 
              className="sidebar-item"
              onClick={() => navigate('/dashboard')}
            >
              <FaHome className="sidebar-icon" />
              <span className="sidebar-text">Home</span>
            </button>
            
            <button 
              className="sidebar-item"
              onClick={() => navigate('/dashboard?view=calendar')}
            >
              <FaCalendarAlt className="sidebar-icon" />
              <span className="sidebar-text">Calendar</span>
            </button>
            
            <hr className="sidebar-separator" />
            
            <button 
              className="sidebar-item active"
            >
              <span className="sidebar-text">To do</span>
            </button>
            
            <hr className="sidebar-separator" />
            
            <button 
              className="sidebar-item"
              onClick={() => navigate('/dashboard?view=archived')}
            >
              <FaArchive className="sidebar-icon" />
              <span className="sidebar-text">Archived Classes</span>
            </button>
            
            <button 
              className="sidebar-item"
              onClick={() => navigate('/dashboard?view=settings')}
            >
              <FaCog className="sidebar-icon" />
              <span className="sidebar-text">Settings</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <div className={`main-content ${sidebarOpen ? '' : 'expanded'}`}>
          <div className="todo-view">
            <div className="todo-header">
              <h1 className="todo-title">To do</h1>
              <p className="todo-subtitle">All your assignments and exams in one place</p>
            </div>

            {/* Google Classroom Tabs */}
            <div className="google-classroom-tabs">
              <button 
                className={`tab ${activeTab === 'missing' ? 'active' : ''}`}
                onClick={() => setActiveTab('missing')}
              >
                Missing
              </button>
              <button 
                className={`tab ${activeTab === 'done' ? 'active' : ''}`}
                onClick={() => setActiveTab('done')}
              >
                Done
              </button>
            </div>

            <div className="todo-content">
              {/* All Classes Section */}
              <div className="all-classes-section">
                <h2 className="all-classes-title">All classes</h2>
                
                {/* No due date section */}
                <AssignmentSection title="No due date" assignments={noDueDate} />
                
                {/* Date-based sections */}
                <AssignmentSection title="This week" assignments={thisWeek} />
                <AssignmentSection title="Next week" assignments={nextWeek} />
                <AssignmentSection title="Later" assignments={later} />

                {filteredAssignments.length === 0 && (
                  <div className="empty-todo">
                    <div className="empty-state-icon">
                      {activeTab === 'missing' ? '📝' : '✅'}
                    </div>
                    <h3>
                      {activeTab === 'missing' 
                        ? 'No missing assignments' 
                        : 'No completed assignments'
                      }
                    </h3>
                    <p>
                      {activeTab === 'missing'
                        ? "You're all caught up! No assignments are missing."
                        : "You haven't completed any assignments yet."
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}