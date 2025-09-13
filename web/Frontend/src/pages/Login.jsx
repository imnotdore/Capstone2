import { useState } from "react";
import api from "../lib/api";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "", role: "student" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", {
        email: form.email,
        password: form.password,
      });

      const { token, user } = res.data;

      if (form.role !== user.role) {
        setError(`❌ You are not allowed to login as ${form.role}.`);
        setLoading(false);
        return;
      }

      localStorage.setItem("token", token);
      localStorage.setItem("role", user.role);

      if (user.role === "student") {
        navigate("/student/dashboard");
      } else if (user.role === "teacher") {
        navigate("/teacher/dashboard");
      } else {
        setError("❌ Invalid role");
      }
    } catch (err) {
      setError(err.response?.data?.message || "❌ Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      {/* Left branding text */}
      <div style={styles.leftText}>
        <h1 style={styles.brand}>AI-Based Online Exam Proctoring System</h1>
        <p style={styles.tagline}>
          Secure • Smart • Reliable <br /> Online Exam Proctoring
        </p>

        {/* ✅ Home button (same style as Get Started) */}
        <button
  style={styles.getStartedBtn}
  onClick={() => navigate("/")}
  onMouseEnter={(e) => (e.target.style.background = "#218838")}
  onMouseLeave={(e) => (e.target.style.background = "#28a745")}
>
  Home
</button>

      </div>

      {/* Login Form */}
      <div style={styles.rightPanel}>
        <div style={styles.card}>
          <h2 style={styles.title}>Login</h2>
          {error && <p style={styles.error}>{error}</p>}
          <form onSubmit={handleSubmit} style={styles.form}>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              style={styles.select}
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>

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
            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
          <p style={styles.registerText}>
            Don’t have an account? <Link to="/register">Register</Link>
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
    gap: "20px",
  },
  brand: {
    fontSize: "3rem",
    marginBottom: "15px",
  },
  tagline: {
    fontSize: "1.3rem",
    lineHeight: 1.5,
    maxWidth: "250px",
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
    maxWidth: "400px",
    boxShadow: "0 8px 16px rgba(0,0,0,0.3)",
    textAlign: "center",
  },
  getStartedBtn: {
    marginTop: "20px",
    padding: "14px 30px",
    background: "#28a745",
    color: "#fff",
    fontSize: "1rem",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "0.3s",
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
  select: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "1rem",
    outline: "none",
  },
  button: {
    background: "#3498dbff",
    color: "#fff",
    padding: "14px 30px",
    fontSize: "1rem",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  registerText: {
    marginTop: "15px",
    fontSize: "0.9rem",
  },
    getStartedBtn: {
    marginTop: "20px",
    padding: "14px 30px",
    background: "#28a745",
    color: "#fff",
    fontSize: "1rem",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },

};
