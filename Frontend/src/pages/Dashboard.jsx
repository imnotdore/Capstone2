// src/pages/Dashboard.jsx - COMPLETELY UPDATED WITH ERROR FIXES
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus, FaHome, FaCalendarAlt, FaArchive, FaCog, FaSignOutAlt, FaBook, FaUserPlus, FaBars, FaChevronLeft, FaChevronRight } from "react-icons/fa";
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

  // CLASSWORK STATES
  const [classwork, setClasswork] = useState([]);
  const [showClassworkModal, setShowClassworkModal] = useState(false);
  const [classworkType, setClassworkType] = useState("assignment");
  const [classworkForm, setClassworkForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    points: "",
    topic: ""
  });

  // UNENROLL STATES
  const [showMenuForClass, setShowMenuForClass] = useState(null);
  const [showUnenrollModal, setShowUnenrollModal] = useState(false);
  const [classToUnenroll, setClassToUnenroll] = useState(null);

  // ARCHIVE STATES
  const [archivedClasses, setArchivedClasses] = useState([]);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [classToArchive, setClassToArchive] = useState(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [classToRestore, setClassToRestore] = useState(null);

  // CALENDAR STATES
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");

  // USER ROLE STATE
  const [userRole, setUserRole] = useState("");

  // DROPDOWN STATES
  const [enrolledDropdownOpen, setEnrolledDropdownOpen] = useState(false);
  const [teachingDropdownOpen, setTeachingDropdownOpen] = useState(false);

  // REVIEW COUNT STATE
  const [itemsToReview, setItemsToReview] = useState(0);

  // Refs for click outside detection
  const userDropdownRef = useRef(null);
  const createJoinDropdownRef = useRef(null);
  const sidebarRef = useRef(null);
  const postOptionsRef = useRef(null);
  const menuRef = useRef(null);

  // Separate classes into teaching and enrolled
  const teachingClasses = classes.filter(classData => classData.userRole === "teacher" || classData.isTeacher);
  const enrolledClasses = classes.filter(classData => classData.userRole === "student" || !classData.isTeacher);
  const allClasses = [...classes];

  // ===== FIXED DATA FETCHING FUNCTIONS =====

  // FIXED: Fetch archived classes with better error handling
  const fetchArchivedClasses = async () => {
    try {
      console.log("📦 Fetching archived classes...");
      const res = await api.get('/class/archived');
      console.log("✅ Archived classes response:", res.data);
      setArchivedClasses(res.data.data || []);
    } catch (error) {
      console.error("❌ Failed to fetch archived classes:", error);
      setArchivedClasses([]); // Set empty array on error
    }
  };

  // FIXED: Fetch review count with better error handling
  const fetchReviewCount = async () => {
    if (userRole === 'teacher') {
      try {
        console.log("📊 Fetching review count...");
        const res = await api.get('/class/items-to-review');
        console.log("✅ Review count response:", res.data);
        setItemsToReview(res.data.count || 0);
      } catch (error) {
        console.error('❌ Failed to fetch review count:', error);
        setItemsToReview(0); // Set to 0 on error
      }
    }
  };

  // FIXED: Fetch announcements with better error handling
  const fetchAnnouncements = async () => {
    if (!selectedClass) return;
    
    setLoadingAnnouncements(true);
    try {
      console.log("📢 Fetching announcements for class:", selectedClass._id);
      const res = await api.get(`/announcements/class/${selectedClass._id}`);
      console.log("✅ Announcements response:", res.data);
      setAnnouncements(res.data.data || []);
    } catch (error) {
      console.error("❌ Failed to fetch announcements:", error);
      setAnnouncements([]); // Use empty array instead of mock data
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  // FIXED: Main data fetching with better error handling
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        console.log("👤 Fetching user data...");
        const userRes = await api.get("/auth/me");
        const userData = userRes.data;
        setUser(userData);
        console.log("✅ User data:", userData);

        // ENHANCED ROLE CHECK
        const storedRole = localStorage.getItem('userRole');
        const userRoleFromAPI = userData.role;
        
        if (!storedRole && !userRoleFromAPI && !userData.hasSelectedRole) {
          navigate('/auth/success?token=' + token);
          return;
        }

        let finalRole = storedRole || userRoleFromAPI;
        
        if (!finalRole) {
          try {
            console.log("🎭 Detecting role from classes...");
            const classesRes = await api.get("/class/my-classes");
            const classesData = classesRes.data.data || classesRes.data;
            const hasTeachingClasses = classesData.some(
              classData => classData.userRole === "teacher" || classData.isTeacher
            );
            finalRole = hasTeachingClasses ? "teacher" : "student";
            localStorage.setItem('userRole', finalRole);
            console.log("✅ Detected role:", finalRole);
          } catch (classError) {
            console.error("❌ Failed to fetch classes for role detection:", classError);
            finalRole = "student"; // Default to student on error
          }
        }

        setUserRole(finalRole);

        // Fetch classes
        try {
          console.log("🏫 Fetching classes...");
          const classesRes = await api.get("/class/my-classes");
          const classesData = classesRes.data.data || classesRes.data;
          setClasses(classesData);
          console.log("✅ Classes loaded:", classesData.length);
        } catch (classError) {
          console.error("❌ Failed to fetch classes:", classError);
          setClasses([]);
        }

        // Fetch archived classes
        await fetchArchivedClasses();
        
      } catch (error) {
        console.error("❌ Failed to fetch user data:", error);
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          navigate('/login');
        }
      }
    };
    fetchData();
  }, [navigate]);

  // FIXED: Fetch review count when user role changes
  useEffect(() => {
    if (userRole) {
      fetchReviewCount();
    }
  }, [userRole]);

  // FIXED: Fetch announcements when class is selected
  useEffect(() => {
    if (selectedClass && activeTab === 'stream') {
      fetchAnnouncements();
    }
  }, [selectedClass, activeTab]);

  // FIXED: Fetch classwork when class is selected and active tab is classwork
  useEffect(() => {
    if (selectedClass && activeTab === 'classwork') {
      fetchClasswork();
    }
  }, [selectedClass, activeTab]);

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

      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenuForClass(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Generate calendar events when classes change
  useEffect(() => {
    generateCalendarEvents();
  }, [classes]);

  // NEW: Fetch classwork
  const fetchClasswork = async () => {
    if (!selectedClass) return;
    
    try {
      const classworkRes = await api.get(`/classwork/${selectedClass._id}`);
      setClasswork(classworkRes.data?.data || classworkRes.data || []);
    } catch (error) {
      console.log("Classwork endpoint not available yet, using mock data");
      setClasswork([
        {
          _id: '1',
          title: 'Welcome Assignment',
          description: 'Complete this introductory assignment to get started',
          type: 'assignment',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          points: 100,
          topic: 'Introduction',
          createdBy: { name: user.name },
          createdAt: new Date().toISOString()
        }
      ]);
    }
  };

  // NEW: Create classwork item
  const createClasswork = async (e) => {
    e.preventDefault();
    if (!classworkForm.title) {
      alert("Title is required");
      return;
    }

    try {
      const res = await api.post(`/classwork/${selectedClass._id}/create`, {
        ...classworkForm,
        type: classworkType,
        points: classworkForm.points ? parseInt(classworkForm.points) : undefined,
        dueDate: classworkForm.dueDate || undefined
      });

      setClasswork([...classwork, res.data]);
      setClassworkForm({ title: "", description: "", dueDate: "", points: "", topic: "" });
      setShowClassworkModal(false);
      alert(res.data.message || "Classwork created successfully!");
    } catch (err) {
      console.error(err);
      // Mock success for demo
      const newItem = {
        _id: Date.now().toString(),
        ...classworkForm,
        type: classworkType,
        createdBy: { name: user.name },
        createdAt: new Date().toISOString()
      };
      setClasswork([...classwork, newItem]);
      setClassworkForm({ title: "", description: "", dueDate: "", points: "", topic: "" });
      setShowClassworkModal(false);
      alert("Classwork created successfully! (Demo Mode)");
    }
  };

  // NEW: Get icon for classwork type
  const getClassworkIcon = (type) => {
    const icons = {
      assignment: "📝",
      quiz: "❓",
      question: "💬",
      material: "📎",
      announcement: "📢",
      topic: "📂"
    };
    return icons[type] || "📄";
  };

  // CALENDAR FUNCTIONS
  const getClassColor = (classId) => {
    const colors = [
      '#4285f4', '#34a853', '#fbbc04', '#ea4335', '#a142f4', 
      '#00bcd4', '#ff6d00', '#2962ff', '#00c853', '#aa00ff'
    ];
    const index = classId ? classId.charCodeAt(0) % colors.length : 0;
    return colors[index];
  };

  const generateCalendarEvents = () => {
    const events = [];
    
    classes.forEach(classData => {
      if (classData.exams && classData.exams.length > 0) {
        classData.exams.forEach(exam => {
          events.push({
            id: exam._id,
            title: exam.title || 'Exam',
            class: classData.name,
            classId: classData._id,
            date: exam.scheduledAt ? new Date(exam.scheduledAt) : new Date(),
            type: 'exam',
            color: getClassColor(classData._id)
          });
        });
      }
    });

    if (events.length === 0) {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      classes.slice(0, 3).forEach((classData, index) => {
        const demoDate1 = new Date(currentYear, currentMonth, 10 + index * 3);
        const demoDate2 = new Date(currentYear, currentMonth, 15 + index * 2);
        
        events.push(
          {
            id: `demo-${classData._id}-1`,
            title: `${classData.name} Assignment`,
            class: classData.name,
            classId: classData._id,
            date: demoDate1,
            type: 'assignment',
            color: getClassColor(classData._id)
          },
          {
            id: `demo-${classData._id}-2`,
            title: `${classData.name} Quiz`,
            class: classData.name,
            classId: classData._id,
            date: demoDate2,
            type: 'exam',
            color: getClassColor(classData._id)
          }
        );
      });
    }

    setCalendarEvents(events);
  };

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  const getEventsForDate = (date) => {
    return calendarEvents.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === date.getDate() &&
             eventDate.getMonth() === date.getMonth() &&
             eventDate.getFullYear() === date.getFullYear() &&
             (selectedClassFilter === "all" || event.classId === selectedClassFilter);
    });
  };

  const getFilteredEvents = () => {
    if (selectedClassFilter === "all") {
      return calendarEvents;
    }
    return calendarEvents.filter(event => event.classId === selectedClassFilter);
  };

  const formatMonthYear = (date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // UNENROLL FUNCTIONS
  const toggleMenu = (classId, event) => {
    event.stopPropagation();
    setShowMenuForClass(showMenuForClass === classId ? null : classId);
  };

  const confirmUnenroll = (classData, event) => {
    event.stopPropagation();
    setClassToUnenroll(classData);
    setShowUnenrollModal(true);
    setShowMenuForClass(null);
  };

  const unenrollFromClass = async () => {
    if (!classToUnenroll) return;
    
    try {
      await api.delete(`/class/${classToUnenroll._id}/unenroll`);
      
      setClasses(prevClasses => prevClasses.filter(classData => classData._id !== classToUnenroll._id));
      
      if (selectedClass && selectedClass._id === classToUnenroll._id) {
        setSelectedClass(null);
      }
      
      setShowUnenrollModal(false);
      setClassToUnenroll(null);
      
      alert("Successfully unenrolled from class!");
    } catch (error) {
      console.error("Failed to unenroll:", error);
      alert(error.response?.data?.message || "Failed to unenroll from class");
    }
  };

  // ARCHIVE FUNCTIONS
  const confirmArchive = (classData, event) => {
    event.stopPropagation();
    setClassToArchive(classData);
    setShowArchiveModal(true);
    setShowMenuForClass(null);
  };

  const archiveClass = async () => {
    if (!classToArchive) return;
    
    try {
      await api.put(`/class/${classToArchive._id}/archive`);
      
      setClasses(prevClasses => prevClasses.filter(classData => classData._id !== classToArchive._id));
      setArchivedClasses(prev => [...prev, { ...classToArchive, isArchived: true }]);
      
      if (selectedClass && selectedClass._id === classToArchive._id) {
        setSelectedClass(null);
      }
      
      setShowArchiveModal(false);
      setClassToArchive(null);
      
      alert("Class archived successfully!");
    } catch (error) {
      console.error("Failed to archive class:", error);
      alert(error.response?.data?.message || "Failed to archive class");
    }
  };

  const confirmRestore = (classData, event) => {
    event.stopPropagation();
    setClassToRestore(classData);
    setShowRestoreModal(true);
  };

  const restoreClass = async () => {
    if (!classToRestore) return;
    
    try {
      await api.put(`/class/${classToRestore._id}/restore`);
      
      setArchivedClasses(prev => prev.filter(classData => classData._id !== classToRestore._id));
      setClasses(prevClasses => [...prevClasses, { ...classToRestore, isArchived: false }]);
      
      setShowRestoreModal(false);
      setClassToRestore(null);
      
      alert("Class restored successfully!");
    } catch (error) {
      console.error("Failed to restore class:", error);
      alert(error.response?.data?.message || "Failed to restore class");
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
    setActiveTab("stream");
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
    localStorage.removeItem("userRole");
    window.location.href = "/login";
  };

  // FIXED: Create announcement with proper endpoint
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

      // Use the correct announcement endpoint
      const res = await api.post('/announcements', announcementData);
      
      const newAnnouncement = res.data.data;
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
      
      // Fallback to mock data if API fails
      const mockAnnouncement = {
        _id: Date.now().toString(),
        classId: selectedClass._id,
        content: announcementContent,
        status: status,
        createdBy: { name: user.name },
        createdAt: new Date().toISOString(),
        scheduledFor: status === 'scheduled' && scheduleDate && scheduleTime ? 
          new Date(`${scheduleDate}T${scheduleTime}`).toISOString() : null
      };
      
      setAnnouncements(prev => [mockAnnouncement, ...prev]);
      setAnnouncementContent("");
      setShowAnnouncementModal(false);
      setIsScheduling(false);
      setScheduleDate("");
      setScheduleTime("");
      
      alert(`Announcement ${status} successfully! (Demo Mode)`);
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

  // CLASS CARD COMPONENT WITH MENU
  const ClassCard = ({ classData }) => {
    const isTeacher = classData.userRole === "teacher";
    
    return (
      <div 
        key={classData._id} 
        className="class-card bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 cursor-pointer relative overflow-visible"
        onClick={() => handleSelectClass(classData)}
      >
        {/* Menu Button - Show different options for teachers vs students */}
        <div className="absolute top-3 right-3 z-50">
          <button 
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-md border border-gray-200"
            onClick={(e) => toggleMenu(classData._id, e)}
          >
            <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          
          {/* Dropdown Menu */}
          {showMenuForClass === classData._id && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
              {isTeacher ? (
                // TEACHER MENU OPTIONS
                <>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenuForClass(null);
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <span>Edit class</span>
                  </button>
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 flex items-center space-x-2 transition-colors"
                    onClick={(e) => confirmArchive(classData, e)}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    <span>Archive class</span>
                  </button>
                  <hr className="my-1" />
                  <button
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenuForClass(null);
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete class</span>
                  </button>
                </>
              ) : (
                // STUDENT MENU OPTIONS
                <button
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors"
                  onClick={(e) => confirmUnenroll(classData, e)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Unenroll from class</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Class Card Content */}
        <div className="p-4">
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold text-lg text-gray-800 truncate flex-1 pr-12">{classData.name}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              isTeacher 
                ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                : 'bg-green-100 text-green-800 border border-green-200'
            }`}>
              {isTeacher ? "Teacher" : "Student"}
            </span>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Class Code: <strong className="font-mono bg-gray-100 px-2 py-1 rounded border">{classData.code}</strong>
            </p>
            <p className="text-sm text-gray-600">
              Owner: <span className="font-medium">{classData.ownerId?.name || "You"}</span>
            </p>
            <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
              <span className="flex items-center bg-gray-50 px-2 py-1 rounded">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                </svg>
                {classData.members?.length || 1} members
              </span>
              <span className="flex items-center bg-gray-50 px-2 py-1 rounded">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd"/>
                </svg>
                {classData.exams?.length || 0} exams
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // UNENROLL CONFIRMATION MODAL
  const UnenrollModal = () => {
    if (!showUnenrollModal || !classToUnenroll) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Unenroll from Class</h3>
              <p className="text-sm text-gray-600">This action cannot be undone.</p>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
            <p className="text-sm text-yellow-800">
              Are you sure you want to unenroll from <strong>"{classToUnenroll.name}"</strong>?
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              You will lose access to all class materials, announcements, and exams.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowUnenrollModal(false);
                setClassToUnenroll(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={unenrollFromClass}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
            >
              Yes, Unenroll
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ARCHIVE CONFIRMATION MODAL
  const ArchiveModal = () => {
    if (!showArchiveModal || !classToArchive) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Archive Class</h3>
              <p className="text-sm text-gray-600">This class will be moved to archived.</p>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
            <p className="text-sm text-yellow-800">
              Are you sure you want to archive <strong>"{classToArchive.name}"</strong>?
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Archived classes are hidden from your main view but can be restored later.
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowArchiveModal(false);
                setClassToArchive(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={archiveClass}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
            >
              Archive Class
            </button>
          </div>
        </div>
      </div>
    );
  };

  // RESTORE CONFIRMATION MODAL
  const RestoreModal = () => {
    if (!showRestoreModal || !classToRestore) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Restore Class</h3>
              <p className="text-sm text-gray-600">This class will be moved back to active classes.</p>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
            <p className="text-sm text-blue-800">
              Restore <strong>"{classToRestore.name}"</strong> to your active classes?
            </p>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowRestoreModal(false);
                setClassToRestore(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={restoreClass}
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
            >
              Restore Class
            </button>
          </div>
        </div>
      </div>
    );
  };

  // CLASSWORK MODAL
  const ClassworkModal = () => {
    if (!showClassworkModal) return null;

    return (
      <div className="modal">
        <div className="modal-content large-modal">
          <h3>Create</h3>
          
          {/* Type Selection */}
          <div className="type-selection">
            <label>Select type:</label>
            <div className="type-grid">
              {["assignment", "quiz", "question", "material", "announcement", "topic"].map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`type-btn ${classworkType === type ? "active" : ""}`}
                  onClick={() => setClassworkType(type)}
                >
                  {getClassworkIcon(type)} {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={createClasswork}>
            <input
              type="text"
              placeholder="Title"
              value={classworkForm.title}
              onChange={(e) => setClassworkForm({...classworkForm, title: e.target.value})}
              required
            />
            
            <textarea
              placeholder="Description (optional)"
              value={classworkForm.description}
              onChange={(e) => setClassworkForm({...classworkForm, description: e.target.value})}
              rows="3"
            />

            <div className="form-row">
              <input
                type="text"
                placeholder="Topic (optional)"
                value={classworkForm.topic}
                onChange={(e) => setClassworkForm({...classworkForm, topic: e.target.value})}
              />
              
              {(classworkType === "assignment" || classworkType === "quiz") && (
                <input
                  type="number"
                  placeholder="Points"
                  value={classworkForm.points}
                  onChange={(e) => setClassworkForm({...classworkForm, points: e.target.value})}
                />
              )}
            </div>

            {(classworkType === "assignment" || classworkType === "quiz") && (
              <input
                type="datetime-local"
                value={classworkForm.dueDate}
                onChange={(e) => setClassworkForm({...classworkForm, dueDate: e.target.value})}
              />
            )}

            <div className="modal-actions">
              <button type="submit" className="primary-btn">
                Create {classworkType}
              </button>
              <button type="button" onClick={() => setShowClassworkModal(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // FIXED ANNOUNCEMENT MODAL
  const AnnouncementModal = () => {
    if (!showAnnouncementModal) return null;

    return (
      <div className="modal">
        <div className="modal-content large-modal">
          <div className="modal-header">
            <h3>Create Announcement</h3>
            <button 
              className="close-btn"
              onClick={() => {
                setShowAnnouncementModal(false);
                setAnnouncementContent("");
                setIsScheduling(false);
                setScheduleDate("");
                setScheduleTime("");
              }}
            >
              ×
            </button>
          </div>

          {/* Class Selection */}
          <div className="announcement-for-section">
            <p className="announcement-for-label">For</p>
            <div className="class-selection">
              <div className="selected-class">
                <span className="class-name">{selectedClass?.name || 'No class selected'}</span>
              </div>
            </div>
          </div>

          <div className="announcement-editor">
            <textarea
              className="announcement-textarea"
              placeholder="Announce something to your class"
              value={announcementContent}
              onChange={(e) => setAnnouncementContent(e.target.value)}
              rows="6"
            />
          </div>

          {/* Attachment Buttons */}
          <div className="attachment-buttons">
            <button className="attachment-btn" title="Add Google Drive file">
              📎
            </button>
            <button className="attachment-btn" title="Add YouTube video">
              🎬
            </button>
            <button className="attachment-btn" title="Upload file">
              📤
            </button>
            <button className="attachment-btn" title="Add link">
              🔗
            </button>
          </div>

          {/* Scheduling Section */}
          {isScheduling && (
            <div className="scheduling-section">
              <h4>Schedule Announcement</h4>
              <div className="schedule-inputs">
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="schedule-input"
                />
                <input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="schedule-input"
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="modal-actions announcement-actions">
            <button 
              className="cancel-btn"
              onClick={() => {
                setShowAnnouncementModal(false);
                setAnnouncementContent("");
                setIsScheduling(false);
              }}
            >
              Cancel
            </button>
            
            <div className="post-actions">
              <button 
                className="secondary-btn"
                onClick={() => setIsScheduling(!isScheduling)}
              >
                {isScheduling ? 'Cancel Schedule' : 'Schedule'}
              </button>
              
              <button 
                className="secondary-btn"
                onClick={handleSaveDraft}
                disabled={!announcementContent.trim()}
              >
                Save Draft
              </button>
              
              <button 
                className="primary-btn"
                onClick={isScheduling ? handleScheduleAnnouncement : handlePostAnnouncement}
                disabled={!announcementContent.trim() || (isScheduling && (!scheduleDate || !scheduleTime))}
              >
                {isScheduling ? 'Schedule' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // GOOGLE CLASSROOM STYLE CALENDAR COMPONENT
  const GoogleClassroomCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayOfMonth = getFirstDayOfMonth(currentDate);
    const today = new Date();
    
    // Generate calendar days
    const calendarDays = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      calendarDays.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const dayEvents = getEventsForDate(date);
      calendarDays.push({
        date,
        day,
        events: dayEvents,
        isToday: date.toDateString() === today.toDateString(),
        isCurrentMonth: true
      });
    }

    return (
      <div className="google-classroom-calendar">
        {/* Calendar Header */}
        <div className="calendar-header-section">
          <div className="calendar-nav">
            <button 
              className="calendar-nav-btn"
              onClick={() => navigateMonth('prev')}
            >
              <FaChevronLeft className="nav-icon" />
            </button>
            <h2 className="calendar-month-title">
              {formatMonthYear(currentDate)}
            </h2>
            <button 
              className="calendar-nav-btn"
              onClick={() => navigateMonth('next')}
            >
              <FaChevronRight className="nav-icon" />
            </button>
          </div>
          
          {/* Class Filter */}
          <div className="class-filter-section">
            <select 
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="class-filter-select"
            >
              <option value="all">All classes</option>
              {classes.map(classData => (
                <option key={classData._id} value={classData._id}>
                  {classData.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="calendar-grid-container">
          {/* Weekday Headers */}
          <div className="calendar-weekdays">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="weekday-header">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="calendar-days-grid">
            {calendarDays.map((dayData, index) => (
              <div
                key={index}
                className={`calendar-day ${!dayData ? 'empty-day' : ''} ${
                  dayData?.isToday ? 'today' : ''
                } ${dayData?.events.length > 0 ? 'has-events' : ''}`}
                onClick={() => dayData && setSelectedDate(dayData.date)}
              >
                {dayData && (
                  <>
                    <div className="day-number">{dayData.day}</div>
                    {dayData.events.length > 0 && (
                      <div className="day-events">
                        {dayData.events.slice(0, 2).map((event, eventIndex) => (
                          <div
                            key={eventIndex}
                            className="event-dot"
                            style={{ backgroundColor: event.color }}
                            title={`${event.title} - ${event.class}`}
                          />
                        ))}
                        {dayData.events.length > 2 && (
                          <div className="more-events">+{dayData.events.length - 2}</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events Sidebar */}
        <div className="calendar-sidebar">
          <div className="sidebar-section">
            <h3 className="sidebar-title">Upcoming</h3>
            <div className="upcoming-events-list">
              {getFilteredEvents()
                .filter(event => new Date(event.date) >= new Date())
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .slice(0, 5)
                .map(event => (
                  <div key={event.id} className="upcoming-event-item">
                    <div 
                      className="event-color-indicator"
                      style={{ backgroundColor: event.color }}
                    />
                    <div className="event-details">
                      <div className="event-title">{event.title}</div>
                      <div className="event-class">{event.class}</div>
                      <div className="event-date">
                        {new Date(event.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              
              {getFilteredEvents().filter(event => new Date(event.date) >= new Date()).length === 0 && (
                <div className="no-upcoming-events">
                  <div className="no-events-icon">📅</div>
                  <p>No upcoming events</p>
                  <span>When you have scheduled exams or assignments, they'll appear here.</span>
                </div>
              )}
            </div>
          </div>

          {/* Today's Events */}
          <div className="sidebar-section">
            <h3 className="sidebar-title">Today</h3>
            <div className="todays-events-list">
              {getEventsForDate(today).map(event => (
                <div key={event.id} className="today-event-item">
                  <div 
                    className="event-color-indicator"
                    style={{ backgroundColor: event.color }}
                    />
                  <div className="event-details">
                    <div className="event-title">{event.title}</div>
                    <div className="event-class">{event.class}</div>
                  </div>
                </div>
              ))}
              
              {getEventsForDate(today).length === 0 && (
                <div className="no-today-events">
                  <span>No events today</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Rest of your existing render functions remain the same...
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

  // NEW: RENDER CLASSWORK TAB
  const renderClassworkTab = () => {
    return (
      <div className="classwork-tab">
        {/* Classwork Header with Create Button */}
        <div className="classwork-header-section">
          <div className="classwork-header">
            <h2>Classwork</h2>
            {selectedClass?.userRole === "teacher" && (
              <button 
                className="create-classwork-btn"
                onClick={() => setShowClassworkModal(true)}
              >
                + Create
              </button>
            )}
          </div>

          {/* Teacher/Student Status Indicator */}
          <div className="role-indicator">
            {selectedClass?.userRole === "teacher" ? (
              <div className="teacher-indicator">
                ✅ You are viewing this class as a <strong>teacher</strong>. You can create assignments and manage classwork.
              </div>
            ) : (
              <div className="student-indicator">
                👨‍🎓 You are viewing this class as a <strong>student</strong>. You can view assignments but cannot create them.
              </div>
            )}
          </div>
        </div>

        {/* Classwork Content */}
        <div className="classwork-content">
          {/* If no classwork exists */}
          {classwork.length === 0 ? (
            <div className="classwork-empty-state">
              <div className="empty-illustration">
                <svg width="200" height="150" viewBox="0 0 200 150" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="40" y="50" width="120" height="80" rx="8" fill="#F8F9FA" stroke="#DADCE0" strokeWidth="2"/>
                  <rect x="50" y="60" width="100" height="12" rx="6" fill="#E8F0FE"/>
                  <rect x="50" y="80" width="80" height="8" rx="4" fill="#F1F3F4"/>
                  <rect x="50" y="95" width="60" height="8" rx="4" fill="#F1F3F4"/>
                  <circle cx="160" cy="110" r="15" fill="#1A73E8" fillOpacity="0.1" stroke="#1A73E8" strokeWidth="2"/>
                  <path d="M155 110L158 113L165 106" stroke="#1A73E8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="empty-content">
                <h3 className="empty-title">This is where you'll assign work</h3>
                <p className="empty-description">
                  You can add assignments and other work for the class, then organize it into topics.
                </p>
                {selectedClass?.userRole === "teacher" && (
                  <button 
                    className="primary-btn"
                    onClick={() => setShowClassworkModal(true)}
                  >
                    + Create your first assignment
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* Classwork Grid */
            <div className="classwork-grid">
              {classwork.map((item) => (
                <div className="classwork-card" key={item._id}>
                  <div className="classwork-header">
                    <span className="classwork-icon">
                      {getClassworkIcon(item.type)}
                    </span>
                    <div>
                      <h3>{item.title}</h3>
                      <p className="classwork-type">{item.type}</p>
                    </div>
                  </div>
                  {item.description && (
                    <p className="classwork-description">{item.description}</p>
                  )}
                  <div className="classwork-meta">
                    {item.dueDate && (
                      <span>Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                    )}
                    {item.points && (
                      <span>{item.points} points</span>
                    )}
                    {item.topic && (
                      <span>Topic: {item.topic}</span>
                    )}
                  </div>
                  <div className="classwork-footer">
                    <span>Created by {item.createdBy?.name || 'Teacher'}</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

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

          {/* Classwork Tab */}
          {activeTab === "classwork" && renderClassworkTab()}

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
              {/* Grades content... */}
            </div>
          )}
        </div>
      );
    }

    // HOME VIEW - Shows all classes
    return (
      <div className="home-view">
        {allClasses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-actions">
              {/* Show different buttons based on user role */}
              {userRole === "teacher" ? (
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
            {allClasses.map((classData) => (
              <ClassCard key={classData._id} classData={classData} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // UPDATED CALENDAR CONTENT - Google Classroom Style
  const renderCalendarContent = () => (
    <div className="calendar-view">
      <div className="calendar-header">
        <h2>Calendar</h2>
        <p>View your scheduled exams and assignments</p>
      </div>
      <GoogleClassroomCalendar />
    </div>
  );

  const renderArchivedContent = () => (
    <div className="archived-view">
      <div className="archived-header">
        <h2>Archived Classes</h2>
      </div>

      {archivedClasses.length === 0 ? (
        <div className="archived-empty">
          <h3>No archived classes</h3>
          <p>When you archive classes, they'll appear here.</p>
        </div>
      ) : (
        <div className="archived-classes-grid">
          {archivedClasses.map((classData) => (
            <div key={classData._id} className="archived-class-card">
              <div className="archived-class-content">
                <div className="archived-class-header">
                  <h3 className="archived-class-name">{classData.name}</h3>
                  <span className="archived-badge">Archived</span>
                </div>
                
                <div className="archived-class-info">
                  <p className="text-sm text-gray-600">
                    Class Code: <strong className="font-mono">{classData.code}</strong>
                  </p>
                  <p className="text-sm text-gray-600">
                    Archived: {new Date(classData.archivedAt).toLocaleDateString()}
                  </p>
                  <div className="flex justify-between text-xs text-gray-500 pt-2">
                    <span>{classData.members?.length || 1} members</span>
                    <span>{classData.exams?.length || 0} exams</span>
                  </div>
                </div>

                <div className="archived-class-actions">
                  <button
                    className="restore-btn"
                    onClick={(e) => confirmRestore(classData, e)}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Restore
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
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
            <span>CAPSTONE</span>
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
                {/* Show only Create Class for Teachers */}
                {userRole === "teacher" && (
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
                )}
                
                {/* Show only Join Class for Students */}
                {userRole === "student" && (
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
                )}
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
                    <div className="user-role">Role: {userRole}</div>
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
            
            {/* TEACHER-ONLY TEACHING DROPDOWN SECTION */}
            {userRole === "teacher" && (
              <>
                {teachingClasses.length > 0 ? (
                  <>
                    <div 
                      className="section-header dropdown-header"
                      onClick={() => setTeachingDropdownOpen(!teachingDropdownOpen)}
                    >
                      <span>Teaching ({teachingClasses.length})</span>
                      <span className={`dropdown-arrow ${teachingDropdownOpen ? 'open' : ''}`}>
                        <FaChevronLeft />
                      </span>
                    </div>
                    
                    {teachingDropdownOpen && (
                      <div className="teaching-dropdown">
                        {/* To Review Button */}
                        <button 
                          className="review-button"
                          onClick={() => navigate('/review')}
                        >
                          <span className="review-icon">📝</span>
                          <span className="review-text">To review</span>
                          <span className="review-badge">{itemsToReview}</span>
                        </button>
                        
                        {/* Teaching Classes List */}
                        <div className="teaching-classes-list">
                          {teachingClasses.map((classData) => (
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
                                <span className="class-details">{classData.section || classData.code}</span>
                              </div>
                              <span className="role-badge teacher">Teacher</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="empty-teaching-section">
                    <p className="empty-teaching-text">You're not teaching any classes yet</p>
                    <button 
                      className="create-class-sidebar-btn"
                      onClick={() => setShowCreateModal(true)}
                    >
                      Create Class
                    </button>
                  </div>
                )}
              </>
            )}
            
            {/* STUDENT-ONLY ENROLLED SECTION WITH TO DO BUTTON */}
            {userRole === "student" && enrolledClasses.length > 0 && (
              <>
                <div 
                  className="section-header dropdown-header"
                  onClick={() => setEnrolledDropdownOpen(!enrolledDropdownOpen)}
                >
                  <span>Enrolled ({enrolledClasses.length})</span>
                  <span className={`dropdown-arrow ${enrolledDropdownOpen ? 'open' : ''}`}>
                    <FaChevronLeft />
                  </span>
                </div>
                
                {enrolledDropdownOpen && (
                  <div className="enrolled-dropdown">
                    {/* To Do Button - ONLY FOR STUDENTS */}
                    <button 
                      className="todo-button"
                      onClick={() => navigate('/todo')}
                    >
                      <span className="todo-icon">📝</span>
                      <span className="todo-text">To do</span>
                    </button>
                    
                    {/* Enrolled Classes List */}
                    <div className="enrolled-classes-list">
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
                  </div>
                )}
              </>
            )}
            
            {/* EMPTY STATE FOR STUDENTS */}
            {userRole === "student" && enrolledClasses.length === 0 && (
              <div className="empty-sidebar-section">
                <p className="empty-sidebar-text">You haven't enrolled in any classes yet</p>
                <button 
                  className="create-class-sidebar-btn"
                  onClick={() => setShowJoinModal(true)}
                >
                  Join Class
                </button>
              </div>
            )}
            
            <hr className="sidebar-separator" />
            
            {/* To Do Button in Main Sidebar - ONLY SHOW FOR STUDENTS */}
            {userRole === "student" && (
              <button 
                className="sidebar-item"
                onClick={() => navigate('/todo')}
              >
                <span className="sidebar-text">To do</span>
              </button>
            )}
            
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

      {/* MODALS SECTION */}
      {/* Create Class Modal */}
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

      {/* Join Class Modal */}
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

      {/* Classwork Modal */}
      <ClassworkModal />

      {/* Announcement Modal */}
      <AnnouncementModal />

      {/* Unenroll Modal */}
      <UnenrollModal />

      {/* Archive Modal */}
      <ArchiveModal />

      {/* Restore Modal */}
      <RestoreModal />
    </div>
  );
}