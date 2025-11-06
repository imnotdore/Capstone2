// src/pages/Login.jsx
import { useState } from "react";
import api from "../lib/api";
import { useNavigate, Link } from "react-router-dom";
import styles from "./Login.module.css";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleGoogleLogin = () => {
    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      // ✅ Now with /api since all routes are under /api
      window.location.href = `${backendUrl}/auth/google`;
    } catch (error) {
      setError("Google login is currently unavailable. Please use email login.");
    }
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

      localStorage.setItem("token", token);
      localStorage.setItem("userName", user.name);

      console.log("✅ Login successful - User:", user.name);

      // ✅ ALWAYS REDIRECT TO SINGLE DASHBOARD
      navigate("/dashboard");

    } catch (err) {
      setError(err.response?.data?.message || "❌ Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* Left branding text */}
      <div className={styles.leftText}>
        <h1 className={styles.brand}>Bawal daw magcheat</h1>
        <p className={styles.tagline}>
          Secure • Smart • Reliable <br /> Online Exam Proctoring
        </p>

        <button className={styles.homeBtn} onClick={() => navigate("/")}>
          Home
        </button>
      </div>

      {/* Login Form */}
      <div className={styles.rightPanel}>
        <div className={styles.card}>
          <h2 className={styles.title}>Login to Your Account</h2>
          <p className={styles.subtitle}>Enter your credentials to continue</p>

          {/* Google Login Button */}
          <button type="button" onClick={handleGoogleLogin} className={styles.googleButton}>
            <span className={styles.googleIcon}>G</span>
            Continue with Google
          </button>

          <div className={styles.divider}>
            <span className={styles.dividerText}>or login with email</span>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={form.email}
              onChange={handleChange}
              required
              className={styles.input}
            />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              className={styles.input}
            />
            
            {/* Error message below password input */}
            {error && (
              <div className={styles.errorContainer}>
                <p className={styles.error}>{error}</p>
              </div>
            )}

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <p className={styles.registerText}>
            Don't have an account? <Link to="/register">Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}