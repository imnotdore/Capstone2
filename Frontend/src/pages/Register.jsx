// src/pages/Register.jsx
import { useState } from "react";
import api from "../lib/api";
import { useNavigate, Link } from "react-router-dom";
import styles from "./Register.module.css";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    // ❌ REMOVED: role, studentId, teacherId
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState("");
  const [tempUser, setTempUser] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // ✅ Password validation
  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return {
      isValid: password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar,
      requirements: {
        minLength: password.length >= minLength,
        hasUpperCase,
        hasLowerCase,
        hasNumbers,
        hasSpecialChar
      }
    };
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
  // ✅ CAPTCHA Verification
  const verifyCaptcha = () => {
    const userResponse = prompt("Please type 'I AM HUMAN' to prove you're not a robot:");
    return userResponse?.toUpperCase() === "I AM HUMAN";
  };

  // ✅ Registration Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate password
    const passwordValidation = validatePassword(form.password);
    if (!passwordValidation.isValid) {
      setError("❌ Password does not meet requirements");
      return;
    }

    // CAPTCHA verification
    if (!verifyCaptcha()) {
      setError("❌ CAPTCHA verification failed");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/auth/register", {
        name: form.name,
        email: form.email,
        username: form.username,
        password: form.password
        // ❌ REMOVED: role, studentId, teacherId
      });
      
      // Show OTP verification
      setTempUser({ email: form.email });
      setShowOTP(true);
      
    } catch (err) {
      setError(err.response?.data?.message || "❌ Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // ✅ OTP Verification
  const handleOTPVerify = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post("/auth/verify-email", {
        email: tempUser.email,
        otp: otp
      });
      
      navigate("/login", { 
        state: { message: "✅ Registration successful! Please login." } 
      });
    } catch (err) {
      setError(err.response?.data?.message || "❌ Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const passwordValidation = validatePassword(form.password);

  return (
    <div className={styles.wrapper}>
      {/* Left branding text */}
      <div className={styles.leftText}>
        <h1 className={styles.brand}>AI-Based Online Exam Proctoring System</h1>
        <p className={styles.tagline}>
          Secure • Smart • Reliable <br /> Online Exam Proctoring
        </p>

        <button className={styles.homeBtn} onClick={() => navigate("/login")}>
          Back to Login
        </button>
      </div>

      {/* Register Form */}
      <div className={styles.rightPanel}>
        <div className={styles.card}>
          <h2 className={styles.title}>Create Account</h2>
          {error && <p className={styles.error}>{error}</p>}

          {/* Google Login Button */}
          <button type="button" onClick={handleGoogleLogin} className={styles.googleButton}>
            <span className={styles.googleIcon}>G</span>
            Continue with Google
          </button>

          <div className={styles.divider}>
            <span className={styles.dividerText}>or register with email</span>
          </div>

          {!showOTP ? (
            // Registration Form
            <form onSubmit={handleSubmit} className={styles.form}>
              <input
                type="text"
                name="name"
                placeholder="Full Name *"
                value={form.name}
                onChange={handleChange}
                required
                className={styles.input}
              />
              
              <input
                type="email"
                name="email"
                placeholder="Email Address *"
                value={form.email}
                onChange={handleChange}
                required
                className={styles.input}
              />
              
              <input
                type="text"
                name="username"
                placeholder="Username (optional)"
                value={form.username}
                onChange={handleChange}
                className={styles.input}
              />
              
              <div className={styles.passwordContainer}>
                <input
                  type="password"
                  name="password"
                  placeholder="Password *"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className={styles.input}
                />
                {/* Password Requirements */}
                {form.password && (
                  <div className={styles.passwordRequirements}>
                    <p>Password must contain:</p>
                    <ul>
                      <li className={passwordValidation.requirements.minLength ? styles.valid : styles.invalid}>
                        At least 8 characters
                      </li>
                      <li className={passwordValidation.requirements.hasUpperCase ? styles.valid : styles.invalid}>
                        One uppercase letter
                      </li>
                      <li className={passwordValidation.requirements.hasLowerCase ? styles.valid : styles.invalid}>
                        One lowercase letter
                      </li>
                      <li className={passwordValidation.requirements.hasNumbers ? styles.valid : styles.invalid}>
                        One number
                      </li>
                      <li className={passwordValidation.requirements.hasSpecialChar ? styles.valid : styles.invalid}>
                        One special character
                      </li>
                    </ul>
                  </div>
                )}
              </div>

              <button type="submit" className={styles.button} disabled={loading}>
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          ) : (
            // OTP Verification Form
            <form onSubmit={handleOTPVerify} className={styles.form}>
              <div className={styles.otpMessage}>
                <p>📧 Verification code sent to:</p>
                <p className={styles.emailText}>{tempUser?.email}</p>
                <p>Please check your email and enter the OTP below:</p>
              </div>
              
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className={styles.input}
                maxLength="6"
                required
              />
              
              <div className={styles.otpButtons}>
                <button type="button" onClick={() => setShowOTP(false)} className={styles.backButton}>
                  Back
                </button>
                <button type="submit" className={styles.verifyButton} disabled={loading}>
                  {loading ? "Verifying..." : "Verify OTP"}
                </button>
              </div>
            </form>
          )}

          <p className={styles.registerText}>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}