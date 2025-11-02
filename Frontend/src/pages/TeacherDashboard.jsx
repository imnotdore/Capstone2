import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import "./TeacherDashboard.css";

export default function TeacherDashboard() {
  const [profile, setProfile] = useState({ name: "Loading...", avatar: null });
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [activeTab, setActiveTab] = useState("Classwork");
  const [students, setStudents] = useState([]);
  const [exams, setExams] = useState([]);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showExamModal, setShowExamModal] = useState(false);
  const [className, setClassName] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [examTitle, setExamTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examFile, setExamFile] = useState(null);
  const navigate = useNavigate();

  const [showExamViewModal, setShowExamViewModal] = useState(false);
  const [currentExamTitle, setCurrentExamTitle] = useState("");
  const [currentExamFile, setCurrentExamFile] = useState("");

  // Fetch teacher profile
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

  // Fetch teacher classes
  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/class/teacher/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Normalize _id as string
      const normalizedClasses = res.data.map((c) => ({ ...c, _id: c._id.toString() }));
      setClasses(normalizedClasses);
    } catch (err) {
      console.error("Failed to fetch classes", err);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const generateClassCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setGeneratedCode(code);
    return code;
  };

  const createClass = async (e) => {
    e.preventDefault();
    if (!className) return alert("Enter class name");
    const codeToSend = generatedCode || generateClassCode();

    try {
      const token = localStorage.getItem("token");
      const res = await api.post(
        "/class",
        { name: className, code: codeToSend },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchClasses();
      setSelectedClass({ ...res.data, _id: res.data._id.toString() });
      setExams([]);
      setStudents([]);
      setClassName("");
      setGeneratedCode("");
      setShowClassModal(false);
    } catch {
      alert("Failed to create class.");
    }
  };

  // Select class & fetch exams + students
  // Select class & fetch exams + students
const handleSelectClass = async (c) => {
  setSelectedClass(c);
  setActiveTab("Classwork");
  try {
    const token = localStorage.getItem("token");

    const examsRes = await api.get(`/exams/${c._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    // Simple fix - gamitin ang data kung array, kung hindi gumamit ng empty array
    const examsData = Array.isArray(examsRes.data) 
      ? examsRes.data 
      : (examsRes.data?.data || []);
    
    const normalizedExams = examsData.map((exam) => ({
      ...exam,
      _id: exam._id.toString(),
    }));
    
    setExams(normalizedExams);

    const studentsRes = await api.get(`/class/students/${c._id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    const studentsData = Array.isArray(studentsRes.data) 
      ? studentsRes.data 
      : (studentsRes.data?.data || []);
    
    setStudents(studentsData);
    
  } catch (err) {
    console.error("Failed to fetch exams or students", err);
    alert("Failed to fetch class data.");
  }
};
  const uploadExam = async (e) => {
  e.preventDefault();
  if (!examTitle || !examDate || !examFile) return alert("Fill all fields");
  if (!selectedClass) return alert("Select a class first");

  const formData = new FormData();
  formData.append("title", examTitle);
  formData.append("scheduledAt", examDate);
  formData.append("file", examFile);

  try {
    const token = localStorage.getItem("token");
    const res = await api.post(
      `/exams/upload/${selectedClass._id}`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      }
    );
    
    // I-adjust base sa response structure
    const newExam = res.data.data || res.data;
    
    setExams([...exams, { ...newExam, _id: newExam._id.toString() }]);
    setExamTitle("");
    setExamDate("");
    setExamFile(null);
    setShowExamModal(false);
  } catch {
    alert("Failed to upload exam.");
  }
};

  const handleViewExam = (exam) => {
    setCurrentExamTitle(exam.title);
    setCurrentExamFile(exam.fileUrl);
    setShowExamViewModal(true);
  };

  const handleDeleteExam = async (examId) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      const token = localStorage.getItem("token");
      await api.delete(`/exams/${examId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setExams(exams.filter((exam) => exam._id !== examId));
    } catch {
      alert("Failed to delete exam.");
    }
  };

const handleDeployExam = async (examId) => {
  if (!examId || examId.length !== 24) return alert("Invalid exam ID");

  console.log("Deploying exam with ID:", examId);

  try {
    const token = localStorage.getItem("token");
    const res = await api.patch(
      `/exams/deploy/${examId}`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log("Deploy response:", res.data);

    setExams(
      exams.map((exam) =>
        exam._id === examId ? { ...exam, isDeployed: true } : exam
      )
    );

    const roomId = `exam-${examId}`;
    
    navigate(`/room/${roomId}`, {
      state: {
        teacherName: profile.name,
        teacherId: profile.id || "teacher_unique_id", // Gamitin ang actual user ID
        classSubject: selectedClass.name
      }
    });
  } catch (err) {
    console.error("Deploy error:", err.response?.data || err);
    alert(err.response?.data?.message || "Failed to deploy exam.");
  }
};

 


  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <div className="teacher-wrapper">
      <header className="teacher-header">
        <h1 className="logo">Classroom Dashboard</h1>
        <div className="header-right">
          <div className="profile">
            {profile.avatar && <img src={profile.avatar} alt="avatar" />}
            <span>Prof {profile.name}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="teacher-main">
        {/* Sidebar */}
        <aside className="sidebar">
          <h2>📚 My Classes</h2>
          <button
            className="primary-btn"
            onClick={() => {
              generateClassCode();
              setShowClassModal(true);
            }}
          >
            + Create Class
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
                  {c.name}
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
                <p>No classes created yet.</p>
              ) : (
                classes.map((c) => (
                  <div
                    key={c._id}
                    className="class-card"
                    onClick={() => handleSelectClass(c)}
                  >
                    <h3>📘 {c.name}</h3>
                    <p>Code: {c.code}</p>
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

              {/* Tabs */}
              <div className="class-tabs">
                {["Classwork", "People", "Grades"].map((tab) => (
                  <button
                    key={tab}
                    className={activeTab === tab ? "active" : ""}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === "Classwork" && (
                <div>
                  <button
                    className="primary-btn"
                    onClick={() => setShowExamModal(true)}
                  >
                    Upload Exam
                  </button>

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

                          <div className="exam-actions">
                            <button
                              className="small-btn"
                              onClick={() => handleViewExam(exam)}
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleDeleteExam(exam._id)}
                              className="danger-btn"
                            >
                              Delete
                            </button>
                            {!exam.isDeployed && (
                              <button
                                onClick={() => handleDeployExam(exam._id)}
                                className="deploy-btn"
                              >
                                Deploy
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "People" && (
  <div>
    {/* Teacher Info */}
    <h4>👨‍🏫 Class Owner</h4>
    <div className="teacher-owner">
      <img
        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
          profile.name
        )}&background=203a43&color=fff`}
        alt={profile.name}
        className="teacher-avatar"
      />
      <span>{profile.name} (Teacher)</span>
    </div>

    <hr />

    {/* Students List */}
    <h4>👩‍🎓 Enrolled Students</h4>
    {students.filter(s => s.name !== profile.name).length === 0 ? (
      <p>No students enrolled yet.</p>
    ) : (
      <ul className="student-list">
        {students
          .filter(s => s.name !== profile.name)
          .map((s) => {
            const initials = s.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase();

            return (
              <li key={s._id} className="student-item" title={s.email}>
                <img
                  src={`https://ui-avatars.com/api/?name=${initials}&background=203a43&color=fff`}
                  alt={s.name}
                  className="student-avatar"
                />
                <span>{s.name}</span>
              </li>
            );
          })}
      </ul>
    )}
  </div>
)}

              {activeTab === "Grades" && (
                <div>
                  <p>Gradebook will be displayed here.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* MODALS */}
      {showClassModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Create New Class</h3>
            <form onSubmit={createClass}>
              <input
                type="text"
                placeholder="Class Name"
                value={className}
                onChange={(e) => setClassName(e.target.value.toUpperCase())}
              />

              <div className="code-row">
                <input type="text" value={generatedCode} readOnly />
              </div>
              <div className="modal-actions">
                <button type="submit" className="primary-btn">
                  Create
                </button>
                <button type="button" onClick={() => setShowClassModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExamModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Upload Exam</h3>
            <form onSubmit={uploadExam}>
              <input
                type="text"
                placeholder="Exam Title"
                value={examTitle}
                onChange={(e) => setExamTitle(e.target.value)}
              />
              <input
                type="datetime-local"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
              />
              <input
                type="file"
                onChange={(e) => setExamFile(e.target.files[0])}
              />
              <div className="modal-actions">
                <button type="submit" className="primary-btn">
                  Upload
                </button>
                <button type="button" onClick={() => setShowExamModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showExamViewModal && (
        <div
          className="modal"
          onClick={() => setShowExamViewModal(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {currentExamFile ? (
              currentExamFile.endsWith(".pdf") ? (
                <iframe src={currentExamFile} title={currentExamTitle} />
              ) : (
                <iframe
                  src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
                    currentExamFile
                  )}`}
                  title={currentExamTitle}
                />
              )
            ) : (
              <p style={{ textAlign: "center" }}>No preview available</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
