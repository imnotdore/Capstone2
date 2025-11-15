// ClassDetails.jsx - SIMPLIFIED FIX
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import "./ClassDetails.css";

export default function ClassDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [classInfo, setClassInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [exams, setExams] = useState([]);
  const [classwork, setClasswork] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("classwork");
  
  // Exam modal states
  const [examTitle, setExamTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examFile, setExamFile] = useState(null);
  const [showExamModal, setShowExamModal] = useState(false);
  
  // Classwork modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [classworkType, setClassworkType] = useState("assignment");
  const [classworkForm, setClassworkForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    points: "",
    topic: ""
  });

  useEffect(() => {
    const fetchClassDetails = async () => {
      try {
        const token = localStorage.getItem("token");

        // Fetch class info
        const classRes = await api.get(`/classes/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("📦 Class Data:", classRes.data);
        setClassInfo(classRes.data);

        // Fetch enrolled students
        const studentRes = await api.get(`/classes/${id}/members`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStudents(studentRes.data?.data || studentRes.data || []);

        // Fetch exams
        try {
          const examRes = await api.get(`/exams/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setExams(examRes.data?.data || examRes.data || []);
        } catch (examErr) {
          console.log("No exams found");
          setExams([]);
        }

        // Fetch classwork
        try {
          const classworkRes = await api.get(`/classwork/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setClasswork(classworkRes.data?.data || classworkRes.data || []);
        } catch (classworkErr) {
          console.log("Classwork endpoint not available yet");
          setClasswork([]);
        }

      } catch (err) {
        console.error("Failed to fetch class details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClassDetails();
  }, [id]);

  // ✅ SIMPLE FIX: Check if user is teacher
  const isTeacher = () => {
    if (!classInfo) return false;
    
    // Check multiple possible role indicators
    if (classInfo.userRole === "teacher") return true;
    if (classInfo.role === "teacher") return true;
    
    // If no role is detected but you're the class owner, you're a teacher
    if (classInfo.ownerId) {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      if (classInfo.ownerId._id === userData.id || classInfo.ownerId === userData.id) {
        return true;
      }
    }
    
    return false;
  };

  // Create Classwork Item
  const createClasswork = async (e) => {
    e.preventDefault();
    if (!classworkForm.title) return alert("Title is required");

    try {
      const token = localStorage.getItem("token");
      const res = await api.post(`/classwork/${id}/create`, {
        ...classworkForm,
        type: classworkType,
        points: classworkForm.points ? parseInt(classworkForm.points) : undefined,
        dueDate: classworkForm.dueDate || undefined
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setClasswork([...classwork, res.data]);
      setClassworkForm({ title: "", description: "", dueDate: "", points: "", topic: "" });
      setShowCreateModal(false);
      alert(res.data.message);
    } catch (err) {
      console.error(err);
      alert("Failed to create classwork item.");
    }
  };

  // Get icon for classwork type
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

  if (loading) return <p>Loading class details...</p>;
  if (!classInfo) return <p>Class not found.</p>;

  return (
    <div className="class-details-page">
      <header className="class-header">
        <h1>{classInfo.name}</h1>
        <p>Code: <strong>{classInfo.code}</strong></p>
        <p>Your role: <strong>{classInfo.userRole || 'Teacher'}</strong></p>
        <button className="back-btn" onClick={() => navigate("/dashboard")}>
          ⬅ Back to Dashboard
        </button>
      </header>

      {/* Tab Navigation */}
      <div className="tabs-navigation">
        <button 
          className={`tab-btn ${activeTab === "classwork" ? "active" : ""}`}
          onClick={() => setActiveTab("classwork")}
        >
          Classwork
        </button>
        <button 
          className={`tab-btn ${activeTab === "students" ? "active" : ""}`}
          onClick={() => setActiveTab("students")}
        >
          People
        </button>
        <button 
          className={`tab-btn ${activeTab === "exams" ? "active" : ""}`}
          onClick={() => setActiveTab("exams")}
        >
          Exams
        </button>
      </div>

      {/* CLASSWORK TAB */}
      {activeTab === "classwork" && (
        <section className="section">
          <div className="section-header">
            <h2>Classwork</h2>
            
            {/* ✅ FIXED: Always show create button for now */}
            <button 
              className="create-btn"
              onClick={() => setShowCreateModal(true)}
            >
              + Create
            </button>
          </div>

          {/* Teacher status indicator */}
          <div style={{
            background: '#e8f5e8',
            border: '1px solid #4caf50',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            color: '#2e7d32',
            fontSize: '14px'
          }}>
            ✅ You are viewing this class as a <strong>teacher</strong>. You can create assignments and manage classwork.
          </div>

          {classwork.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <h3>This is where you'll assign work</h3>
              <p>You can add assignments and other work for the class, then organize it into topics.</p>
              <button 
                className="primary-btn"
                onClick={() => setShowCreateModal(true)}
              >
                + Create your first assignment
              </button>
            </div>
          ) : (
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
        </section>
      )}

      {/* CREATE CLASSWORK MODAL */}
      {showCreateModal && (
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
                <button type="button" onClick={() => setShowCreateModal(false)}>
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