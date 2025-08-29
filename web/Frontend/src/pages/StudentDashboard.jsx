// web/src/pages/StudentDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell } from "react-icons/fa";
import api from "../lib/api";

export default function StudentDashboard() {
  const [classes, setClasses] = useState([]);
  const [classCode, setClassCode] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  // Fetch classes na sinalihan ng student
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/student/classes", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        setClasses(res.data);
      } catch (err) {
        console.error(err);
        addNotification("❌ Failed to load classes", "error");
      }
    };
    fetchData();
  }, []);

  // Add notification
  const addNotification = (text, type) => {
    const newNotif = { id: Date.now(), text, type };
    setNotifications((prev) => [newNotif, ...prev]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== newNotif.id));
    }, 5000); // auto-hide after 5s
  };

  // Join class
  const joinClass = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(
        "/student/join",
        { classCode },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      setClasses([...classes, res.data]);
      addNotification("✅ Joined class successfully!", "success");
      setClassCode("");
    } catch (err) {
      addNotification(err.response?.data?.message || "❌ Failed to join class", "error");
    }
  };

  // Sign out
  const handleSignout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div style={styles.container}>
      {/* 🔹 Header */}
      <header style={styles.header}>
        <h2 style={{ margin: 0 }}>🎓 Student Dashboard</h2>
        <div style={styles.headerRight}>
          {/* Notification Bell */}
          <div style={{ position: "relative" }}>
            <FaBell
              size={22}
              style={{ cursor: "pointer" }}
              onClick={() => setShowDropdown(!showDropdown)}
            />
            {notifications.length > 0 && (
              <span style={styles.notifBadge}>{notifications.length}</span>
            )}

            {showDropdown && (
              <div style={styles.dropdown}>
                {notifications.length === 0 ? (
                  <p style={{ padding: "10px" }}>No notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      style={{
                        ...styles.dropdownItem,
                        background:
                          n.type === "success" ? "#d4edda" : "#f8d7da",
                        color: n.type === "success" ? "#155724" : "#721c24",
                      }}
                    >
                      {n.text}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Sign Out */}
          <button onClick={handleSignout} style={styles.signoutBtn}>
            Sign Out
          </button>
        </div>
      </header>

      {/* 🔹 Join class form */}
      <form onSubmit={joinClass} style={styles.form}>
        <input
          type="text"
          placeholder="Enter Class Code"
          value={classCode}
          onChange={(e) => setClassCode(e.target.value)}
          required
          style={styles.input}
        />
        <button type="submit" style={styles.button}>
          Join Class
        </button>
      </form>

      {/* 🔹 Class list */}
      <h3>📚 My Classes</h3>
      <ul style={styles.classList}>
        {classes.map((c) => (
          <li key={c._id} style={styles.classItem}>
            <strong>{c.name}</strong>{" "}
            <span style={{ color: "#666" }}>({c.code})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f4f7f9",
    padding: "20px 40px",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
    padding: "15px 20px",
    background: "#2c5364",
    color: "#fff",
    borderRadius: "8px",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },
  signoutBtn: {
    background: "#e63946",
    color: "#fff",
    border: "none",
    padding: "8px 15px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  notifBadge: {
    position: "absolute",
    top: "-6px",
    right: "-6px",
    background: "red",
    color: "#fff",
    borderRadius: "50%",
    padding: "2px 6px",
    fontSize: "0.8rem",
    fontWeight: "bold",
  },
  dropdown: {
    position: "absolute",
    top: "28px",
    right: 0,
    background: "#fff",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
    borderRadius: "6px",
    width: "250px",
    zIndex: 100,
  },
  dropdownItem: {
    padding: "10px",
    borderBottom: "1px solid #ddd",
    fontSize: "0.9rem",
  },
  form: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
  },
  input: {
    flex: 1,
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "1rem",
  },
  button: {
    background: "#28a745",
    color: "#fff",
    padding: "10px 18px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  classList: {
    listStyle: "none",
    padding: 0,
  },
  classItem: {
    background: "#fff",
    padding: "12px 15px",
    borderRadius: "8px",
    marginBottom: "10px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
  },
};
