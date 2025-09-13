// web/src/pages/Register.jsx
import { useState } from "react";
import api from "../lib/api";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    studentId: "",
    teacherId: "",
  }); 

  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/register", form);
      alert("✅ Registered successfully!");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "❌ Registration failed");
    }
  };

  return (
    <div style={styles.wrapper}>
      {/* Left branding text */}
      <div style={styles.leftText}>
        <h1 style={styles.brand}>ProctorAI</h1>
        <p style={styles.tagline}>
          Secure • Smart • Reliable <br /> Online Exam Proctoring
        </p>
      </div>

      {/* Register Form */}
      <div style={styles.rightPanel}>
        <div style={styles.card}>
          <h2 style={styles.title}>Register</h2>
          {error && <p style={styles.error}>{error}</p>}
          <form onSubmit={handleSubmit} style={styles.form}>
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={form.name}
              onChange={handleChange}
              required
              style={styles.input}
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
              style={styles.input}
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              style={styles.input}
            />

            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              style={styles.input}
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>

            {form.role === "student" && (
              <input
                type="text"
                name="studentId"
                placeholder="Student ID"
                value={form.studentId}
                onChange={handleChange}
                style={styles.input}
              />
            )}
            {form.role === "teacher" && (
              <input
                type="text"
                name="teacherId"
                placeholder="Teacher ID"
                value={form.teacherId}
                onChange={handleChange}
                style={styles.input}
              />
            )}

            <button type="submit" style={styles.button}>Register</button>
          </form>

          <p style={styles.registerText}>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
    background: "linear-gradient(135deg,#0f2027,#203a43,#2c5364)",
    color: "#fff",
  },
  leftText: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: "40px",
  },
  brand: {
    fontSize: "3rem",
    marginBottom: "15px",
  },
  tagline: {
    fontSize: "1.3rem",
    lineHeight: 1.5,
    maxWidth: "300px",
  },
  rightPanel: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    background: "#fff",
    color: "#333",
    padding: "50px",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "420px",
    boxShadow: "0 8px 16px rgba(0,0,0,0.3)",
    textAlign: "center",
  },
  title: {
    marginBottom: "20px",
    fontSize: "2rem",
  },
  error: {
    color: "red",
    marginBottom: "10px",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "1rem",
    outline: "none",
  },
  button: {
    background: "#3498db",
    color: "#fff",
    padding: "12px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "1rem",
    transition: "background 0.3s",
  },
  registerText: {
    marginTop: "15px",
    fontSize: "0.9rem",
  },
};
