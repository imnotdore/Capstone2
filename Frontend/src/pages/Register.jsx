// src/pages/Register.jsx - UPDATED MODERN UI
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
      setError("Google login is currently unavailable. Please use email registration.");
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

    // Check if it's a Gmail address
    if (!form.email.endsWith('@gmail.com')) {
      setError("❌ Only Gmail accounts are allowed for registration");
      return;
    }

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
      {/* Left Panel - Welcome Message */}
      <div className={styles.leftPanel}>
        <div className={styles.welcomeContainer}>
          <h2 className={styles.welcomeTitle}>Welcome Back!</h2>
          <p className={styles.welcomeText}>
            To keep connected with us please login<br />
            with your personal info
          </p>
          <button 
            className={styles.signInButton}
            onClick={() => navigate("/login")}
          >
            SIGN IN
          </button>
        </div>
      </div>

      {/* Right Panel - Registration Form */}
      <div className={styles.rightPanel}>
        <div className={styles.registerContainer}>
          <h1 className={styles.registerTitle}>Create Account</h1>
          
          {/* Google Button Only */}
          <div className={styles.socialButtons}>
            <button type="button" onClick={handleGoogleLogin} className={`${styles.socialButton} ${styles.google}`}>
              <span className={styles.socialIcon}>G+</span>
            </button>
          </div>

          <div className={styles.divider}>
            <span className={styles.dividerText}>or use your email for registration</span>
          </div>

          {!showOTP ? (
            // Registration Form
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputGroup}>
                <input
                  type="text"
                  name="name"
                  placeholder="Name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className={styles.input}
                />
              </div>
              
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

              {error && (
                <div className={styles.errorContainer}>
                  <p className={styles.error}>{error}</p>
                </div>
              )}

              <button type="submit" className={styles.submitButton} disabled={loading}>
                {loading ? "CREATING ACCOUNT..." : "SIGN UP"}
              </button>
            </form>
          ) : (
            // OTP Verification Form
            <form onSubmit={handleOTPVerify} className={styles.form}>
              <div className={styles.otpMessage}>
                <p>📧 Verification code sent to:</p>
                <p className={styles.emailText}>{tempUser?.email}</p>
                <p>Please check your Gmail and enter the OTP below:</p>
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
                  {loading ? "VERIFYING..." : "VERIFY OTP"}
                </button>
              </div>
            </form>
          )}

          <button className={styles.visitSiteButton}>
            Visit site
          </button>
        </div>
      </div>
    </div>
  );
}