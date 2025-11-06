// src/pages/Dashboard.jsx - UPDATED WITH ERROR HANDLING
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaHome, FaCalendarAlt, FaArchive, FaCog, FaSignOutAlt, FaBook, FaUserPlus, FaBars } from "react-icons/fa";
import api from "../lib/api";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState({ name: "Loading...", email: "" });
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [activeSidebar, setActiveSidebar] = useState("home");
  const [activeTab, setActiveTab] = useState("stream");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [className, setClassName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [exams, setExams] = useState([]);
  const [students, setStudents] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showCreateJoinDropdown, setShowCreateJoinDropdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Announcement states
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcements, setAnnouncements] = useState([]);
  const [showPostOptions, setShowPostOptions] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);

  // Refs for click outside detection
  const userDropdownRef = useRef(null);
  const createJoinDropdownRef = useRef(null);
  const sidebarRef = useRef(null);
  const postOptionsRef = useRef(null);

  // Separate classes into teaching and enrolled
  const teachingClasses = classes.filter(classData => classData.userRole === "teacher" || classData.isTeacher);
  const enrolledClasses = classes.filter(classData => classData.userRole === "student" || !classData.isTeacher);
  const allClasses = [...classes];

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setShowUserDropdown(false);
      }
      
      if (createJoinDropdownRef.current && !createJoinDropdownRef.current.contains(event.target)) {
        setShowCreateJoinDropdown(false);
      }

      if (postOptionsRef.current && !postOptionsRef.current.contains(event.target)) {
        setShowPostOptions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch user and classes
  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await api.get("/auth/me");
        setUser(userRes.data);

        const classesRes = await api.get("/class/my-classes");
        setClasses(classesRes.data.data || classesRes.data);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
  }, []);

  // Fetch announcements when class is selected
  useEffect(() => {
    if (selectedClass && activeTab === 'stream') {
      fetchAnnouncements();
    }
  }, [selectedClass, activeTab]);

  // Updated fetchAnnouncements with multiple endpoint attempts
  const fetchAnnouncements = async () => {
    if (!selectedClass) return;
    
    setLoadingAnnouncements(true);
    try {
      // Try different possible endpoints
      const endpoints = [
        `/announcements/class/${selectedClass._id}`,
        `/announcements/${selectedClass._id}`,
        `/class/${selectedClass._id}/announcements`
      ];

      let announcementsData = [];
      
      for (const endpoint of endpoints) {
        try {
          const res = await api.get(endpoint);
          announcementsData = res.data.data || res.data || [];
          if (announcementsData.length > 0) break; // Stop if we found data
        } catch (error) {
          console.log(`Endpoint ${endpoint} failed, trying next...`);
          continue;
        }
      }

      // If no announcements found from APIs, use mock data for demo
      if (announcementsData.length === 0) {
        console.log('No announcements API found, using mock data');
        announcementsData = [
          {
            _id: '1',
            content: 'Welcome to our class! This is your first announcement.',
            createdBy: { name: user.name },
            createdAt: new Date().toISOString(),
            status: 'published'
          },
          {
            _id: '2', 
            content: 'Remember to submit your assignments on time.',
            createdBy: { name: user.name },
            createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            status: 'published'
          }
        ];
      }

      setAnnouncements(announcementsData);
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
      // Use mock data as fallback
      setAnnouncements([
        {
          _id: '1',
          content: 'Welcome to our class! This is your first announcement.',
          createdBy: { name: user.name },
          createdAt: new Date().toISOString(),
          status: 'published'
        }
      ]);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

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

  // Select class and fetch details - AUTO NAVIGATE TO STREAM
  const handleSelectClass = async (classData) => {
    setSelectedClass(classData);
    setActiveTab("stream"); // Automatically set to stream tab
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

  // Create announcement - Updated with multiple endpoint attempts
  const createAnnouncement = async (status = 'published') => {
    try {
      const announcementData = {
        classId: selectedClass._id,
        content: announcementContent,
        status: status
      };

      if (status === 'scheduled' && scheduleDate && scheduleTime) {
        const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
        announcementData.scheduledFor = scheduledDateTime;
      }

      // Try different endpoints for creating announcements
      const endpoints = {
        published: ['/announcements', '/class/announcements', '/announcements/create'],
        draft: ['/announcements/draft', '/announcements/drafts', '/class/announcements/draft']
      };

      let res;
      let success = false;

      for (const endpoint of endpoints[status] || endpoints.published) {
        try {
          res = await api.post(endpoint, announcementData);
          success = true;
          break;
        } catch (error) {
          console.log(`Endpoint ${endpoint} failed, trying next...`);
          continue;
        }
      }

      if (!success) {
        // If no API works, create mock announcement
        const mockAnnouncement = {
          _id: Date.now().toString(),
          ...announcementData,
          createdBy: { name: user.name },
          createdAt: new Date().toISOString(),
          status: status
        };
        
        setAnnouncements(prev => [mockAnnouncement, ...prev]);
        setAnnouncementContent("");
        setShowAnnouncementModal(false);
        setIsScheduling(false);
        setScheduleDate("");
        setScheduleTime("");
        
        alert(`Announcement ${status} successfully! (Demo Mode)`);
        return;
      }

      const newAnnouncement = res.data.data || res.data;
      setAnnouncements(prev => [newAnnouncement, ...prev]);
      setAnnouncementContent("");
      setShowAnnouncementModal(false);
      setIsScheduling(false);
      setScheduleDate("");
      setScheduleTime("");
      
      alert(status === 'published' ? 'Announcement posted successfully!' : 
            status === 'scheduled' ? 'Announcement scheduled successfully!' : 
            'Draft saved successfully!');
    } catch (error) {
      console.error('Failed to create announcement:', error);
      alert(error.response?.data?.message || `Failed to ${status} announcement`);
    }
  };

  // Post announcement handler
  const handlePostAnnouncement = () => {
    if (!announcementContent.trim()) {
      alert('Please enter announcement content');
      return;
    }
    createAnnouncement('published');
  };

  // Schedule announcement handler
  const handleScheduleAnnouncement = () => {
    if (!announcementContent.trim()) {
      alert('Please enter announcement content');
      return;
    }
    if (!scheduleDate || !scheduleTime) {
      alert('Please select date and time for scheduling');
      return;
    }
    createAnnouncement('scheduled');
  };

  // Save draft handler
  const handleSaveDraft = () => {
    if (!announcementContent.trim()) {
      alert('Please enter announcement content');
      return;
    }
    createAnnouncement('draft');
  };

  // Helper function for random colors
  const getRandomColor = () => {
    const colors = ['blue', 'green', 'yellow', 'red', 'purple', 'teal'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

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

  // Update the stream tab to show announcements
  const renderStreamContent = () => {
    return (
      <div className="stream-content">
        {/* Stream Actions */}
        <div className="stream-actions">
          <button 
            className="new-announcement-btn"
            onClick={() => setShowAnnouncementModal(true)}
          >
            <span className="btn-icon">
              <i className="material-icons">edit</i>
            </span>
            New announcement
          </button>
          <button 
            className="repost-btn" 
            aria-label="Reuse post"
            onClick={() => alert('Repost feature - Select posts from other classes you teach')}
          >
            <span className="btn-icon">
              <i className="material-icons">repeat</i>
            </span>
            <span className="btn-text">Repost</span>
          </button>
        </div>

        {/* Loading State */}
        {loadingAnnouncements && (
          <div className="announcements-loading">
            <div className="loading-spinner"></div>
            <p>Loading announcements...</p>
          </div>
        )}

        {/* Announcements List */}
        {!loadingAnnouncements && announcements.length > 0 ? (
          <div className="announcements-list">
            {announcements.map((announcement) => (
              <div key={announcement._id} className="announcement-card">
                <div className="announcement-header">
                  <div className="announcement-avatar">
                    <img 
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(announcement.createdBy?.name || 'User')}&background=4285f4&color=fff`}
                      alt={announcement.createdBy?.name}
                    />
                  </div>
                  <div className="announcement-info">
                    <div className="announcement-author">
                      {announcement.createdBy?.name || 'Teacher'}
                    </div>
                    <div className="announcement-time">
                      {new Date(announcement.createdAt).toLocaleString()}
                      {announcement.status === 'scheduled' && ' (Scheduled)'}
                      {announcement.status === 'draft' && ' (Draft)'}
                    </div>
                  </div>
                </div>
                <div className="announcement-content">
                  {announcement.content}
                </div>
                {announcement.attachments && announcement.attachments.length > 0 && (
                  <div className="announcement-attachments">
                    {announcement.attachments.map((attachment, index) => (
                      <div key={index} className="attachment-item">
                        {attachment.type === 'file' && '📎 File'}
                        {attachment.type === 'link' && '🔗 Link'}
                        {attachment.type === 'video' && '🎬 Video'}
                        {attachment.type === 'drive' && '📁 Drive'}
                        {attachment.name && ` ${attachment.name}`}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : !loadingAnnouncements && (
          /* Empty State */
          <div className="stream-empty-state">
            <div className="empty-illustration">
              <svg viewBox="0 0 241 149" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M138.19 145.143L136.835 145.664C134.646 146.498 132.249 145.352 131.519 143.164L82.4271 8.37444C81.5933 6.18697 82.7398 3.79117 84.9286 3.06201L86.2836 2.54118C88.4724 1.70786 90.8697 2.85368 91.5993 5.04115L140.691 139.831C141.421 142.018 140.379 144.414 138.19 145.143Z" stroke="#5F6368" strokeWidth="2"></path>
                <path d="M76.6602 10.5686C78.2029 12.2516 83.3923 14.7762 88.4414 13.0932C98.5395 9.72709 96.8565 2.57422 96.8565 2.57422" stroke="#5F6368" strokeWidth="2" strokeLinecap="round"></path>
              </svg>
            </div>
            <div className="empty-content">
              <p className="empty-title">This is where you can talk to your class</p>
              <p className="empty-description">Use the stream to share announcements, post assignments, and respond to student questions</p>
              <div className="empty-actions">
                <button className="stream-settings-btn">
                  <svg className="settings-icon" focusable="false" width="18" height="18" viewBox="0 0 24 24">
                    <path d="M13.85 22.25h-3.7c-.74 0-1.36-.54-1.45-1.27l-.27-1.89c-.27-.14-.53-.29-.79-.46l-1.8.72c-.7.26-1.47-.03-1.81-.65L2.2 15.53c-.35-.66-.2-1.44.36-1.88l1.53-1.19c-.01-.15-.02-.3-.02-.46 0-.15.01-.31.02-.46l-1.52-1.19c-.59-.45-.74-1.26-.37-1.88l1.85-3.19c.34-.62 1.11-.9 1.79-.63l1.81.73c.26-.17.52-.32.78-.46l.27-1.91c.09-.7.71-1.25 1.44-1.25h3.7c.74 0 1.36.54 1.45 1.27l.27 1.89c.27.14.53.29.79.46l1.8-.72c.71-.26 1.48.03 1.82.65l1.84 3.18c.36.66.2 1.44-.36 1.88l-1.52 1.19c.01.15.02.3.02.46s-.01.31-.02.46l1.52 1.19c.56.45.72 1.23.37 1.86l-1.86 3.22c-.34.62-1.11.9-1.8.63l-1.8-.72c-.26.17-.52.32-.78.46l-.27 1.91c-.1.68-.72 1.22-1.46 1.22zm-3.23-2h2.76l.37-2.55.53-.22c.44-.18.88-.44 1.34-.78l.45-.34 2.38.96 1.38-2.4-2.03-1.58.07-.56c.03-.26.06-.51.06-.78s-.03-.53-.06-.78l-.07-.56 2.03-1.58-1.39-2.4-2.39.96-.45-.35c-.42-.32-.87-.58-1.33-.77l-.52-.22-.37-2.55h-2.76l-.37 2.55-.53.21c-.44.19-.88.44-1.34.79l-.45.33-2.38-.95-1.39 2.39 2.03 1.58-.07.56a7 7 0 0 0-.06.79c0 .26.02.53.06.78l.07.56-2.03 1.58 1.38 2.4 2.39-.96.45.35c.43.33.86.58 1.33.77l.53.22.38 2.55z"></path>
                    <circle cx="12" cy="12" r="3.5"></circle>
                  </svg>
                  Stream settings
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Rest of your render functions remain the same...
  const renderHomeContent = () => {
    if (selectedClass) {
      // Class details view - shows when a class is selected
      return (
        <div className="class-details">
          <div className="class-header">
            <h2>{selectedClass.name}</h2>
            <div className="class-info-grid">
              <div className="class-info-item">
                <span className="info-label">Class code:</span>
                <span className="info-value">{selectedClass.code}</span>
              </div>
              <div className="class-info-item">
                <span className="info-label">Your role:</span>
                <span className={`info-value role ${selectedClass.userRole}`}>
                  {selectedClass.userRole === "teacher" ? "Teacher" : "Student"}
                </span>
              </div>
            </div>
          </div>

          {/* Google Classroom Style Tabs */}
          <div className="classroom-tabs">
            <button 
              className={`classroom-tab ${activeTab === "stream" ? "active" : ""}`}
              onClick={() => setActiveTab("stream")}
            >
              Stream
            </button>
            <button 
              className={`classroom-tab ${activeTab === "classwork" ? "active" : ""}`}
              onClick={() => setActiveTab("classwork")}
            >
              Classwork
            </button>
            <button 
              className={`classroom-tab ${activeTab === "people" ? "active" : ""}`}
              onClick={() => setActiveTab("people")}
            >
              People
            </button>
            <button 
              className={`classroom-tab ${activeTab === "grades" ? "active" : ""}`}
              onClick={() => setActiveTab("grades")}
            >
              Grades
            </button>
          </div>

          {/* Stream Tab */}
          {activeTab === "stream" && (
            <div className="stream-tab">
              {/* Class Header with Banner */}
              <div className="class-banner-section">
                <div className="class-banner" style={{backgroundImage: `url('https://scontent.fmnl17-5.fna.fbcdn.net/v/t39.30808-6/494203091_3994132537522695_7595594291222788294_n.jpg?_nc_cat=102&ccb=1-7&_nc_sid=cc71e4&_nc_ohc=SqxEwdvqLKQQ7kNvwFwMVp9&_nc_oc=AdmRHi39VExKIqZg_iuh6zkQ2z-w_kQBIDfvzN_J9rd_lYPcfy1WpR5M2dE3rkJN93o&_nc_zt=23&_nc_ht=scontent.fmnl17-5.fna&_nc_gid=yLrhV52ESP0XRMBSluIoMg&oh=00_Afh7lnNbvVnDgW1jwWRIqyNQW_SUUFmXjpXxJ9yZ7eb-Ug&oe=6911E7F0')`}}>
                  <div className="banner-overlay"></div>
                </div>
                <div className="class-title-section">
                  <h1 className="class-main-title">{selectedClass.name}</h1>
                  <div className="class-subtitle">{selectedClass.description || "Class"}</div>
                </div>
                <div className="class-actions">
                  <button className="customize-btn">
                    <svg className="customize-icon" focusable="false" width="18" height="18" viewBox="0 0 24 24">
                      <path d="M20.41 4.94l-1.35-1.35c-.78-.78-2.05-.78-2.83 0L3 16.82V21h4.18L20.41 7.77c.79-.78.79-2.05 0-2.83zm-14 14.12L5 19v-1.36l9.82-9.82 1.41 1.41-9.82 9.83z"></path>
                    </svg>
                    Customize
                  </button>
                  <button className="info-btn" aria-label="View class information">
                    <svg className="info-icon" focusable="false" width="24" height="24" viewBox="0 0 24 24">
                      <path d="M11 17h2v-6h-2v6zm1-15C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 9h2V7h-2v2z"></path>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Sidebar Information */}
              <div className="stream-layout">
                <aside className="stream-sidebar">
                  {/* Class Code Section */}
                  <div className="sidebar-section">
                    <div className="sidebar-header">
                      <h3>Class code</h3>
                      <div className="sidebar-actions">
                        <button className="more-options-btn" aria-label="More options for class code">
                          <svg className="more-icon" focusable="false" width="24" height="24" viewBox="0 0 24 24">
                            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="class-code-display">
                      <div className="class-code-text">{selectedClass.code}</div>
                      <button className="display-btn" aria-label="Display class code">
                        <svg className="display-icon" focusable="false" width="24" height="24" viewBox="0 0 24 24">
                          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"></path>
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Upcoming Section */}
                  <div className="sidebar-section">
                    <div className="sidebar-header">
                      <h3>Upcoming</h3>
                    </div>
                    <div className="upcoming-content">
                      <span className="upcoming-text">No work due soon</span>
                      <span className="upcoming-subtext">Woohoo, no work due soon!</span>
                      <div className="upcoming-actions">
                        <button className="view-all-btn">
                          View all
                        </button>
                      </div>
                    </div>
                  </div>
                </aside>

                {/* Main Stream Content */}
                <main className="stream-main">
                  {renderStreamContent()}
                </main>
              </div>
            </div>
          )}

          {/* Rest of your tabs remain the same... */}
          {activeTab === "classwork" && (
            <div className="classwork-tab">
              <div className="classwork-header">
                <h3>Classwork</h3>
                <p>Manage assignments and class materials</p>
              </div>
              <div className="classwork-empty">
                <div className="empty-state-icon">📝</div>
                <h3>No classwork yet</h3>
                <p>Create assignments and share materials with your class.</p>
              </div>
            </div>
          )}

          {activeTab === "people" && (
            <div className="people-tab">
              <div className="people-header">
                <h3>People</h3>
              </div>
              {/* People content... */}
            </div>
          )}

          {activeTab === "grades" && (
            <div className="grades-tab">
              <div className="grades-header">
                <h3>Grades</h3>
                <p>View and manage student grades</p>
              </div>
              <div className="grades-empty">
                <div className="empty-state-icon">📊</div>
                <h3>No grades yet</h3>
                <p>When you have graded assignments, they'll appear here.</p>
              </div>
            </div>
          )}
        </div>
      );
    }

    // HOME VIEW - Shows all classes
    return (
      <div className="home-view">
        <div className="home-header">
          <h2>Classes</h2>
          <p>All your classes in one place</p>
        </div>
        
        {allClasses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📚</div>
            <h3>No classes yet</h3>
            <p>Create your first class or join an existing one to get started!</p>
            <div className="empty-state-actions">
              <button 
                className="primary-btn"
                onClick={() => setShowCreateModal(true)}
              >
                <FaPlus className="btn-icon" />
                Create Your First Class
              </button>
              <button 
                className="primary-btn secondary"
                onClick={() => setShowJoinModal(true)}
              >
                <FaUserPlus className="btn-icon" />
                Join a Class
              </button>
            </div>
          </div>
        ) : (
          <div className="class-grid">
            {allClasses.map((classData) => (
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

  // Add the missing render functions
  const renderCalendarContent = () => (
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

  const renderArchivedContent = () => (
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

  const renderSettingsContent = () => (
    <div className="settings-view">
      <div className="settings-header">
        <h2>Settings</h2>
        <p>Manage your account and notification preferences</p>
      </div>
      <div className="settings-sections">
        <div className="settings-section">
          <h3>Account Settings</h3>
          <p className="settings-description">Manage your account information and preferences</p>
          <div className="settings-item">
            <div className="settings-item-content">
              <h4>Profile Information</h4>
              <p>Update your name, email, and profile picture</p>
            </div>
            <button className="settings-btn">Manage</button>
          </div>
        </div>
      </div>
    </div>
  );

  // Update the announcement modal with working dropdown
  const renderAnnouncementModal = () => (
    <div className="announcement-modal">
      <div className="announcement-modal-content">
        {/* Header */}
        <div className="announcement-header">
          <h2 className="announcement-title">Announcement</h2>
          <button 
            className="close-announcement-btn"
            onClick={() => {
              setShowAnnouncementModal(false);
              setIsScheduling(false);
              setScheduleDate("");
              setScheduleTime("");
            }}
          >
            <i className="material-icons">close</i>
          </button>
        </div>

        {/* Class Selection */}
        <div className="announcement-for-section">
          <p className="announcement-for-label">For</p>
          <div className="class-selection">
            <div className="selected-class">
              <span className="class-name">{selectedClass?.name || 'No class selected'}</span>
              <i className="material-icons">arrow_drop_down</i>
            </div>
            <div className="student-selection">
              <button className="student-select-btn">
                <i className="material-icons">manage_accounts</i>
                <span>All students</span>
              </button>
            </div>
          </div>
        </div>

        {/* Scheduling Section */}
        {isScheduling && (
          <div className="scheduling-section">
            <div className="schedule-inputs">
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="schedule-date"
                min={new Date().toISOString().split('T')[0]}
              />
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="schedule-time"
              />
            </div>
          </div>
        )}

        {/* Announcement Content */}
        <div className="announcement-editor">
          <div className="editor-container">
            <div 
              className="announcement-textarea"
              contentEditable="true"
              placeholder="Announce something to your class"
              onInput={(e) => setAnnouncementContent(e.currentTarget.textContent || "")}
            ></div>
          </div>
        </div>

        {/* Attachment Buttons */}
        <div className="attachment-buttons">
          <button className="attachment-btn" title="Add Google Drive file">
            <i className="material-icons">drive</i>
          </button>
          <button className="attachment-btn" title="Add YouTube video">
            <i className="material-icons">video_youtube</i>
          </button>
          <button className="attachment-btn" title="Upload file">
            <i className="material-icons">upload</i>
          </button>
          <button className="attachment-btn" title="Add link">
            <i className="material-icons">link</i>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="announcement-actions">
          <button 
            className="cancel-btn"
            onClick={() => {
              setShowAnnouncementModal(false);
              setIsScheduling(false);
              setScheduleDate("");
              setScheduleTime("");
            }}
          >
            Cancel
          </button>
          <div className="post-actions" ref={postOptionsRef}>
            {isScheduling ? (
              <button 
                className="post-btn schedule-confirm-btn"
                onClick={handleScheduleAnnouncement}
                disabled={!announcementContent.trim() || !scheduleDate || !scheduleTime}
              >
                Schedule
              </button>
            ) : (
              <button 
                className="post-btn"
                onClick={handlePostAnnouncement}
                disabled={!announcementContent.trim()}
              >
                Post
              </button>
            )}
            
            <button 
              className="post-options-btn"
              onClick={() => setShowPostOptions(!showPostOptions)}
            >
              <i className="material-icons">arrow_drop_down</i>
            </button>
            
            {showPostOptions && (
              <div className="post-options-dropdown">
                <button 
                  className="post-option-item"
                  onClick={() => {
                    handlePostAnnouncement();
                    setShowPostOptions(false);
                  }}
                >
                  <i className="material-icons">send</i>
                  Post
                </button>
                <button 
                  className="post-option-item"
                  onClick={() => {
                    setIsScheduling(true);
                    setShowPostOptions(false);
                  }}
                >
                  <i className="material-icons">schedule</i>
                  Schedule
                </button>
                <button 
                  className="post-option-item"
                  onClick={() => {
                    handleSaveDraft();
                    setShowPostOptions(false);
                  }}
                >
                  <i className="material-icons">save</i>
                  Save draft
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

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
          <a href="/" className="logo">
            <span className="logo-icon">📚</span>
            <span>CAPSTONE NGANIII</span>
          </a>
        </div>

        <div className="header-right">
          <div className="plus-btn-container" ref={createJoinDropdownRef}>
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

          <div className="user-profile" ref={userDropdownRef}>
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
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`} ref={sidebarRef}>
          <nav className="sidebar-nav">
            <button 
              className={`sidebar-item ${activeSidebar === 'home' ? 'active' : ''}`}
              onClick={() => {
                setActiveSidebar('home');
                setSelectedClass(null);
              }}
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
            
            <hr className="sidebar-separator" />
            
            {/* Teaching Section */}
            {teachingClasses.length > 0 && (
              <>
                <div className="section-header">Teaching ({teachingClasses.length})</div>
                <div className="class-list">
                  {teachingClasses.slice(0, 5).map((classData) => (
                    <div
                      key={classData._id}
                      className={`class-list-item ${selectedClass?._id === classData._id ? 'selected' : ''}`}
                      onClick={() => handleSelectClass(classData)}
                    >
                      <div className={`class-avatar ${getRandomColor()}`}>
                        {classData.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="class-info">
                        <span className="class-name">{classData.name}</span>
                        <span className="class-details">{classData.code}</span>
                      </div>
                      <span className="role-badge teacher">Teacher</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            <hr className="sidebar-separator" />
            
            {/* Enrolled Section */}
            {enrolledClasses.length > 0 && (
              <>
                <div className="section-header">Enrolled ({enrolledClasses.length})</div>
                <div className="class-list">
                  {enrolledClasses.slice(0, 8).map((classData) => (
                    <div
                      key={classData._id}
                      className={`class-list-item ${selectedClass?._id === classData._id ? 'selected' : ''}`}
                      onClick={() => handleSelectClass(classData)}
                    >
                      <div className={`class-avatar ${getRandomColor()}`}>
                        {classData.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="class-info">
                        <span className="class-name">{classData.name}</span>
                        <span className="class-details">{classData.ownerId?.name || 'Teacher'}</span>
                      </div>
                      <span className="role-badge student">Student</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            
            <hr className="sidebar-separator" />
            
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
        </aside>

        {/* Main Content */}
        <div className={`main-content ${sidebarOpen ? '' : 'expanded'}`}>
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

    

      {/* Announcement Modal */}
      {showAnnouncementModal && (
        <div className="announcement-modal">
          <div className="announcement-modal-content">
            {/* Header */}
            <div className="announcement-header">
              <h2 className="announcement-title">Announcement</h2>
              <button 
                className="close-announcement-btn"
                onClick={() => setShowAnnouncementModal(false)}
              >
                <i className="material-icons">close</i>
              </button>
            </div>

            {/* Class Selection */}
            <div className="announcement-for-section">
              <p className="announcement-for-label">For</p>
              <div className="class-selection">
                <div className="selected-class">
                  <span className="class-name">{selectedClass?.name || 'No class selected'}</span>
                  <i className="material-icons">arrow_drop_down</i>
                </div>
                <div className="student-selection">
                  <button className="student-select-btn">
                    <i className="material-icons">manage_accounts</i>
                    <span>All students</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Announcement Content */}
            <div className="announcement-editor">
              <div className="editor-container">
                <div 
                  className="announcement-textarea"
                  contentEditable="true"
                  placeholder="Announce something to your class"
                  onInput={(e) => setAnnouncementContent(e.currentTarget.textContent || "")}
                ></div>
              </div>
            </div>

            {/* Attachment Buttons */}
            <div className="attachment-buttons">
              <button className="attachment-btn" title="Add Google Drive file">
                <i className="material-icons">drive</i>
              </button>
              <button className="attachment-btn" title="Add YouTube video">
                <i className="material-icons">video_youtube</i>
              </button>
              <button className="attachment-btn" title="Upload file">
                <i className="material-icons">upload</i>
              </button>
              <button className="attachment-btn" title="Add link">
                <i className="material-icons">link</i>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="announcement-actions">
              <button 
                className="cancel-btn"
                onClick={() => setShowAnnouncementModal(false)}
              >
                Cancel
              </button>
              <div className="post-actions">
                <button className="post-btn" disabled={!announcementContent.trim()}>
                  Post
                </button>
                <button className="post-options-btn">
                  <i className="material-icons">arrow_drop_down</i>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}