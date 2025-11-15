// src/pages/Login.jsx - UPDATED WITH ONLY GOOGLE ICON
import { useState, useEffect } from "react";
import api from "../lib/api";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import styles from "./Login.module.css";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check for Google OAuth errors in URL
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Clear error when user starts typing
    if (error) setError("");
  };

  const handleGoogleLogin = () => {
    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
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
      // Check if it's a Gmail address on frontend too
      if (!form.email.endsWith('@gmail.com')) {
        setError("❌ Only Gmail accounts are allowed for login");
        setLoading(false);
        return;
      }

      const res = await api.post("/auth/login", {
        email: form.email,
        password: form.password,
      });

      const { token, user } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("userName", user.name);

      console.log("✅ Login successful - User:", user.name);
      navigate("/dashboard");

    } catch (err) {
      setError(err.response?.data?.message || "❌ Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      {/* Left Panel - Login Form */}
      <div className={styles.leftPanel}>
        <div className={styles.loginContainer}>
          <h1 className={styles.loginTitle}>Sign in</h1>
          
          {/* Google Login Button Only */}
          <div className={styles.socialButtons}>
            <button type="button" onClick={handleGoogleLogin} className={`${styles.socialButton} ${styles.google}`}>
              <span className={styles.socialIcon}>G+</span>
            </button>
          </div>

          <div className={styles.divider}>
            <span className={styles.dividerText}>or use your account</span>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                required
                className={styles.input}
              />
            </div>
            
            <div className={styles.inputGroup}>
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={form.password}
                onChange={handleChange}
                required
                className={styles.input}
              />
            </div>

            <div className={styles.forgotPassword}>
              <a href="#" className={styles.forgotLink}>Forgot your password?</a>
            </div>

            {error && (
              <div className={styles.errorContainer}>
                <p className={styles.error}>{error}</p>
                {error.includes("not registered") && (
                  <p className={styles.registerHint}>
                    Please <Link to="/register">register first</Link> before logging in.
                  </p>
                )}
              </div>
            )}

            <button type="submit" className={styles.submitButton} disabled={loading}>
              {loading ? "SIGNING IN..." : "SIGN IN"}
            </button>
          </form>
        </div>
      </div>

      {/* Right Panel - Welcome Message */}
      <div className={styles.rightPanel}>
        <div className={styles.welcomeContainer}>
         
          <button 
            className={styles.signUpButton}
            onClick={() => navigate("/register")}
          >
            SIGN UP
          </button>
          
        </div>
      </div>
    </div>
  );
}