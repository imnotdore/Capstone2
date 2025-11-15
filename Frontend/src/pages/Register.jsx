// src/pages/Register.jsx - COMPLETELY FIXED WITH reCAPTCHA v2
import { useState, useRef, useEffect } from "react";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";
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
  const [recaptchaLoaded, setRecaptchaLoaded] = useState(false);
  const recaptchaRef = useRef(null);
  const navigate = useNavigate();

  // Load reCAPTCHA script
  useEffect(() => {
    const loadReCaptcha = () => {
      // Check if already loaded
      if (window.grecaptcha) {
        setRecaptchaLoaded(true);
        return;
      }

      // Check if script already exists
      if (document.querySelector('script[src*="recaptcha"]')) {
        // Wait for script to load
        const checkRecaptcha = setInterval(() => {
          if (window.grecaptcha) {
            setRecaptchaLoaded(true);
            clearInterval(checkRecaptcha);
          }
        }, 100);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://www.google.com/recaptcha/api.js?render=explicit`;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        console.log('✅ reCAPTCHA script loaded successfully');
        setRecaptchaLoaded(true);
      };
      script.onerror = () => {
        console.error('❌ Failed to load reCAPTCHA script');
        setError("Failed to load security verification. Please refresh the page.");
      };
      document.head.appendChild(script);
    };

    loadReCaptcha();
  }, []);

  // Initialize reCAPTCHA widget when script loads
  useEffect(() => {
    if (recaptchaLoaded && window.grecaptcha) {
      console.log('🔄 Initializing reCAPTCHA widget...');
      
      // Small delay to ensure DOM is ready
      const initTimeout = setTimeout(() => {
        if (recaptchaRef.current && !recaptchaRef.current.hasChildNodes()) {
          try {
            const widgetId = window.grecaptcha.render(recaptchaRef.current, {
              sitekey: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
              theme: 'light',
              size: 'normal',
              callback: (token) => {
                console.log('✅ reCAPTCHA completed with token');
              },
              'expired-callback': () => {
                console.log('⚠️ reCAPTCHA expired');
                setError("Security verification expired. Please verify again.");
              },
              'error-callback': () => {
                console.log('❌ reCAPTCHA error');
                setError("Security verification failed. Please try again.");
              }
            });
            
            console.log('✅ reCAPTCHA widget created with ID:', widgetId);
          } catch (error) {
            console.error('❌ Error creating reCAPTCHA widget:', error);
            setError("Failed to initialize security verification.");
          }
        }
      }, 500);

      return () => clearTimeout(initTimeout);
    }
  }, [recaptchaLoaded]);

  // Get reCAPTCHA token
  const getRecaptchaToken = () => {
    if (!window.grecaptcha) {
      throw new Error("Security verification not loaded. Please refresh the page.");
    }

    const recaptchaResponse = window.grecaptcha.getResponse();
    
    if (!recaptchaResponse) {
      throw new Error("Please complete the security verification");
    }

    return recaptchaResponse;
  };

  // Reset reCAPTCHA
  const resetRecaptcha = () => {
    if (window.grecaptcha) {
      window.grecaptcha.reset();
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    // Clear error when user starts typing
    if (error) setError("");
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

  // ✅ Registration Handler with reCAPTCHA v2
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Check if it's a Gmail address
    if (!form.email.endsWith('@gmail.com')) {
      setError("❌ Only Gmail accounts are allowed for registration");
      return;
    }

    // Validate required fields
    if (!form.name || !form.email || !form.password) {
      setError("❌ Please fill in all required fields");
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(form.password);
    if (!passwordValidation.isValid) {
      setError("❌ Password does not meet requirements");
      return;
    }

    setLoading(true);

    try {
      // Get reCAPTCHA token (v2 style)
      const recaptchaToken = getRecaptchaToken();
      
      console.log('🔄 Sending registration request with reCAPTCHA token...');
      
      const res = await api.post("/auth/register", {
        name: form.name,
        email: form.email,
        username: form.username || form.name.toLowerCase().replace(/\s+/g, ''),
        password: form.password,
        recaptchaToken: recaptchaToken
      });
      
      if (res.data.success) {
        // Show OTP verification
        setTempUser({ email: form.email });
        setShowOTP(true);
        resetRecaptcha();
        setError("");
      } else {
        throw new Error(res.data.message || "Registration failed");
      }
      
    } catch (err) {
      console.error('❌ Registration error:', err);
      setError(err.response?.data?.message || err.message || "❌ Registration failed");
      resetRecaptcha();
    } finally {
      setLoading(false);
    }
  };

  // ✅ OTP Verification
  const handleOTPVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/verify-email", {
        email: tempUser.email,
        otp: otp
      });

      if (res.data.success) {
        navigate("/login", { 
          state: { message: "✅ Registration successful! Please login." } 
        });
      } else {
        throw new Error(res.data.message || "Verification failed");
      }
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
            <button 
              type="button" 
              onClick={handleGoogleLogin} 
              className={`${styles.socialButton} ${styles.google}`}
            >
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
                  placeholder="Name *"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className={styles.input}
                  disabled={loading}
                />
              </div>
              
              <div className={styles.inputGroup}>
                <input
                  type="email"
                  name="email"
                  placeholder="Email *"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className={styles.input}
                  disabled={loading}
                />
              </div>
              
              <div className={styles.inputGroup}>
                <input
                  type="password"
                  name="password"
                  placeholder="Password *"
                  value={form.password}
                  onChange={handleChange}
                  required
                  className={styles.input}
                  disabled={loading}
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

              {/* Google reCAPTCHA v2 Widget */}
              <div className={styles.recaptchaContainer}>
                {!recaptchaLoaded ? (
                  <div className={styles.recaptchaLoading}>
                    Loading security verification...
                  </div>
                ) : (
                  <div 
                    ref={recaptchaRef}
                    className="g-recaptcha"
                    data-sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                  />
                )}
              </div>

              {error && (
                <div className={styles.errorContainer}>
                  <p className={styles.error}>{error}</p>
                </div>
              )}

              <button 
                type="submit" 
                className={styles.submitButton} 
                disabled={loading || !recaptchaLoaded}
              >
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
              
              <div className={styles.inputGroup}>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={styles.input}
                  maxLength="6"
                  required
                  disabled={loading}
                />
              </div>
              
              {error && (
                <div className={styles.errorContainer}>
                  <p className={styles.error}>{error}</p>
                </div>
              )}

              <div className={styles.otpButtons}>
                <button 
                  type="button" 
                  onClick={() => {
                    setShowOTP(false);
                    setError("");
                  }} 
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
        </div>
      </div>
    </div>
  );
}