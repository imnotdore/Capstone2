// web/src/pages/ClassDetails.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import "./ClassDetails.css";

export default function ClassDetails() {
  const { id } = useParams(); // class id from URL
  const navigate = useNavigate();

  const [classInfo, setClassInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examTitle, setExamTitle] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examFile, setExamFile] = useState(null);
  const [showExamModal, setShowExamModal] = useState(false);

  useEffect(() => {
    const fetchClassDetails = async () => {
      try {
        const token = localStorage.getItem("token");

        // ✅ Fetch class info
        const classRes = await api.get(`/classes/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setClassInfo(classRes.data);

        // ✅ Fetch enrolled students
        const studentRes = await api.get(`/classes/${id}/students`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStudents(studentRes.data);

        // ✅ Fetch exams
        const examRes = await api.get(`/exams/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setExams(examRes.data);

      } catch (err) {
        console.error("Failed to fetch class details:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClassDetails();
  }, [id]);

 // Upload Exam
const uploadExam = async (e) => {
  e.preventDefault();
  if (!examTitle || !examDate || !examFile) return alert("Fill all fields");

  const formData = new FormData();
  formData.append("title", examTitle);
  formData.append("scheduledAt", examDate); // 🔹 match backend
  formData.append("file", examFile);

  try {
    const token = localStorage.getItem("token");
    const res = await api.post(`/exams/upload/${id}`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });

    setExams([...exams, res.data]);
    setExamTitle("");
    setExamDate("");
    setExamFile(null);
    setShowExamModal(false);
  } catch (err) {
    console.error(err);
    alert("Failed to upload exam.");
  }
};


  if (loading) return <p>Loading class details...</p>;
  if (!classInfo) return <p>Class not found.</p>;

  return (
    <div className="class-details-page">
      <header className="class-header">
        <h1>{classInfo.name}</h1>
        <p>
          Code: <strong>{classInfo.code}</strong>
        </p>
        <p>
          Professor: <strong>Prof {classInfo.teacherId?.name}</strong>
        </p>
        <button className="back-btn" onClick={() => navigate("/teacher/dashboard")}>
          ⬅ Back to Dashboard
        </button>
      </header>

      {/* Students */}
      <section className="section">
        <h2>👩‍🎓 Enrolled Students</h2>
        {students.length === 0 ? (
          <p>🚫 No one enrolled yet.</p>
        ) : (
          <ul className="student-list">
            {students.map((s) => (
              <li key={s._id}>
                {s.name} ({s.email})
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Exams */}
      <section className="section">
        <h2>📝 Uploaded Exams</h2>
        <button className="primary-btn" onClick={() => setShowExamModal(true)}>
          + Upload Exam
        </button>

        {exams.length === 0 ? (
          <p>No exams uploaded yet.</p>
        ) : (
          <div className="exam-grid">
            {exams.map((exam) => (
              <div className="exam-card" key={exam._id}>
                <h3>{exam.title}</h3>
                <p>📅 {exam.scheduledAt ? new Date(exam.scheduledAt).toLocaleString() : "No schedule"}</p>
                <a
                  href={exam.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="view-btn"
                >
                  View File
                </a>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL: Upload Exam */}
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
                type="text"
                placeholder="Schedule (e.g. Sept 20, 10:00 AM)"
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
    </div>
  );
}
