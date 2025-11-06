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
      <div className={styles.leftSection}>
        <div className={styles.leftContent}>
          <h1 className={styles.brand}>bawal daw mag cheat</h1>
          <p className={styles.tagline}>
            Secure • Smart • Reliable <br /> Online Exam Proctoring
          </p>

          <button className={styles.homeBtn} onClick={() => navigate("/login")}>
            Back to Login
          </button>
        </div>
      </div>

      {/* Register Form */}
      <div className={styles.rightSection}>
        <div className={styles.card}>
          <h2 className={styles.title}>Create Account</h2>
          {error && <p className={styles.error}>{error}</p>}

          {/* Google Login Button */}
          <button type="button" onClick={handleGoogleLogin} className={styles.googleButton}>
            <span className={styles.googleIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </span>
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
                    <p className={styles.requirementsTitle}>Password must contain:</p>
                    <ul className={styles.requirementsList}>
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

              <button 
                type="submit" 
                className={`${styles.button} ${loading ? styles.loading : ''}`} 
                disabled={loading}
              >
                {loading ? (
                  <span className={styles.buttonContent}>
                    <span className={styles.spinner}></span>
                    Creating Account...
                  </span>
                ) : (
                  "Create Account"
                )}
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
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className={styles.input}
                maxLength="6"
                required
              />
              
              <div className={styles.otpButtons}>
                <button 
                  type="button" 
                  onClick={() => setShowOTP(false)} 
                  className={styles.backButton}
                  disabled={loading}
                >
                  Back
                </button>
                <button 
                  type="submit" 
                  className={`${styles.verifyButton} ${loading ? styles.loading : ''}`} 
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? (
                    <span className={styles.buttonContent}>
                      <span className={styles.spinner}></span>
                      Verifying...
                    </span>
                  ) : (
                    "Verify OTP"
                  )}
                </button>
              </div>
            </form>
          )}

          <p className={styles.loginText}>
            Already have an account? <Link to="/login" className={styles.loginLink}>Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}