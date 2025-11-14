// routes/auth.js - COMPLETE UPDATED VERSION WITH ROLE SELECTION
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const User = require("../models/user");
const Class = require("../models/Class");
const auth = require("../middleware/authMiddleware");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const router = express.Router();

// ========================
// ✅ FIXED EMAIL TRANSPORTER WITH APP PASSWORD SUPPORT
// ========================

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Use Gmail App Password here
  },
  // Add reliability options
  pool: true,
  maxConnections: 1,
  rateDelta: 20000,
  rateLimit: 5
});

// ========================
// ✅ MIDDLEWARE: CHECK REGISTERED GMAIL
// ========================

const checkRegisteredEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    
    if (!email || !email.endsWith('@gmail.com')) {
      return res.status(400).json({ 
        message: "Only Gmail accounts are allowed for login" 
      });
    }
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(403).json({
        message: 'This Gmail account is not registered. Please register first.'
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({
      message: 'Server error during email verification'
    });
  }
};

// ========================
// ✅ ROLE SELECTION ENDPOINTS - NEW & IMPROVED
// ========================

// Role selection endpoint
router.post("/select-role", async (req, res) => {
  try {
    const { role, userId } = req.body;
    
    console.log('🎯 Role selection request:', { role, userId });
    
    if (!['student', 'teacher'].includes(role)) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid role selected" 
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        role: role,
        hasSelectedRole: true 
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    console.log('✅ Role updated for user:', user.email, 'New role:', user.role);

    res.json({ 
      success: true, 
      message: `Role set to ${role} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasSelectedRole: user.hasSelectedRole
      }
    });
  } catch (error) {
    console.error('❌ Role selection error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
});

// Check role status
router.get("/role-status/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ 
      hasSelectedRole: user.hasSelectedRole,
      role: user.role,
      hasTeachingClasses: user.createdClasses && user.createdClasses.length > 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user role (existing route - keep for compatibility)
router.put("/update-role", auth, async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['teacher', 'student'].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { role, hasSelectedRole: true },
      { new: true }
    ).select("-password");
    
    res.json({ 
      message: "Role updated successfully",
      user 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ========================
// ✅ GOOGLE OAUTH ROUTES WITH ROLE SUPPORT
// ========================

router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ 
      message: "Google login is currently unavailable. Please use email login." 
    });
  }
  
  console.log('🔐 Initiating Google OAuth...');
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false
  })(req, res, next);
});

router.get('/api/auth/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ 
      message: "Google login is currently unavailable. Please use email login." 
    });
  }
  
  console.log('🔐 Initiating Google OAuth via /api/auth/google...');
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false
  })(req, res, next);
});

// ========================
// ✅ GOOGLE CALLBACK WITH ROLE INITIALIZATION
// ========================

const handleGoogleCallback = (req, res, next) => {
  passport.authenticate('google', { 
    session: false 
  }, async (err, user, info) => {
    if (err) {
      console.error('❌ Google OAuth error:', err.message);
      const errorMessage = encodeURIComponent(err.message);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=${errorMessage}`);
    }
    if (!user) {
      console.error('❌ Google OAuth failed: No user returned');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=Authentication failed. Please register first.`);
    }
    
    // Initialize role fields for Google OAuth users if not set
    if (!user.hasSelectedRole) {
      console.log('🆕 Initializing role fields for Google OAuth user');
      user.role = null;
      user.hasSelectedRole = false;
      await user.save();
    }
    
    req.user = user;
    next();
  })(req, res, next);
};

const handleGoogleSuccess = (req, res) => {
  try {
    console.log('✅ Google auth successful for user:', req.user.email);
    console.log('👤 User role status:', { 
      role: req.user.role, 
      hasSelectedRole: req.user.hasSelectedRole 
    });
    
    const token = jwt.sign(
      { 
        id: req.user._id, 
        name: req.user.name,
        role: req.user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    
    const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth/success?token=${token}`;
    console.log('🔄 Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('❌ Token generation error:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=token_error`);
  }
};

// Apply to both callback routes
router.get('/google/callback', handleGoogleCallback, handleGoogleSuccess);
router.get('/api/auth/google/callback', handleGoogleCallback, handleGoogleSuccess);

// ========================
// ✅ IMPROVED REGISTRATION WITH BETTER EMAIL SUPPORT
// ========================

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, username } = req.body;

    // Enhanced email validation
    if (!email || !email.endsWith('@gmail.com')) {
      return res.status(400).json({ 
        message: "Only Gmail accounts are allowed for registration" 
      });
    }

    // Check if email already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ 
        message: "Email already exists. Please use a different Gmail address or login." 
      });
    }

    // Enhanced password validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: "Password must contain: at least 8 characters, one uppercase letter, one lowercase letter, one number, and one special character"
      });
    }

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user with role fields initialized
    const user = new User({
      name,
      email,
      username: username || name.toLowerCase().replace(/\s+/g, ''),
      password: hashedPassword,
      isVerified: false,
      verificationToken: otp,
      verificationExpires: otpExpires,
      role: null, // Explicitly set to null
      hasSelectedRole: false // Explicitly set to false
    });

    await user.save();
    console.log('✅ New user registered:', user.email);

    // Enhanced email template
    const mailOptions = {
      from: {
        name: "Exam Proctoring System",
        address: process.env.EMAIL_USER
      },
      to: email,
      subject: "Email Verification - Exam Proctoring System",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 10px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px;">Exam Proctoring System</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Email Verification</p>
          </div>
          <div style="padding: 30px;">
            <h2 style="color: #333; margin-bottom: 20px;">Hello ${name},</h2>
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Thank you for registering with our Exam Proctoring System. 
              To complete your registration, please use the verification code below:
            </p>
            <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; border: 2px dashed #dee2e6; margin: 25px 0;">
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #495057; font-family: 'Courier New', monospace;">
                ${otp}
              </div>
            </div>
            <p style="color: #dc3545; font-size: 14px; text-align: center; margin-bottom: 20px;">
              ⚠️ This code will expire in 10 minutes
            </p>
            <p style="color: #666; line-height: 1.6; font-size: 14px;">
              If you didn't create an account with us, please ignore this email.
            </p>
          </div>
          <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="margin: 0; color: #6c757d; font-size: 12px;">
              Best regards,<br>
              <strong>Exam Proctoring Team</strong>
            </p>
          </div>
        </div>
      `
    };

    // Enhanced email sending with error handling
    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ Verification email sent to: ${email}`);
      
      res.json({ 
        success: true,
        message: "Verification code sent to your Gmail", 
        tempId: user._id 
      });
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError);
      
      // Delete the user if email fails
      await User.findByIdAndDelete(user._id);
      
      return res.status(500).json({ 
        success: false,
        message: "Failed to send verification email. Please check your email address and try again." 
      });
    }

  } catch (err) {
    console.error('❌ Registration error:', err);
    
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false,
        message: "Invalid email format. Only Gmail accounts are allowed." 
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: "Registration failed. Please try again." 
    });
  }
});

// OTP Verification
router.post("/verify-email", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({
      email,
      verificationToken: otp,
      verificationExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid or expired verification code" 
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    console.log('✅ Email verified for:', user.email);

    res.json({ 
      success: true,
      message: "Email verified successfully! You can now login." 
    });

  } catch (err) {
    console.error('❌ OTP verification error:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
});

// ========================
// ✅ IMPROVED LOGIN WITH ROLE SUPPORT
// ========================

router.post("/login", checkRegisteredEmail, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user.password) {
      return res.status(400).json({ 
        success: false,
        message: "Please use Google login for this account" 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ 
      success: false,
      message: "Invalid email or password" 
    });

    if (!user.isVerified) {
      return res.status(400).json({ 
        success: false,
        message: "Please verify your email first. Check your inbox for the verification code.",
        requiresVerification: true 
      });
    }

    const teachingClasses = await Class.find({ ownerId: user._id });
    const isTeacher = teachingClasses.length > 0;

    // Use explicit role if set, otherwise fallback to class-based role
    const userRole = user.role || (isTeacher ? "teacher" : "student");

    const token = jwt.sign(
      { 
        id: user._id, 
        name: user.name,
        role: userRole
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    console.log('✅ User logged in:', user.email, 'Role:', userRole);

    res.json({ 
      success: true,
      token, 
      user: { 
        id: user._id, 
        name: user.name,
        email: user.email,
        role: userRole,
        hasSelectedRole: user.hasSelectedRole
      } 
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
});

// ========================
// ✅ IMPROVED GET CURRENT USER WITH ROLE INFO
// ========================

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ 
      success: false,
      message: "User not found" 
    });
    
    const teachingClasses = await Class.find({ ownerId: req.user.id });
    const isTeacher = teachingClasses.length > 0;
    
    // Use explicit role if set, otherwise fallback to class-based role
    const userRole = user.role || (isTeacher ? "teacher" : "student");
    
    res.json({
      success: true,
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      isVerified: user.isVerified,
      role: userRole,
      hasSelectedRole: user.hasSelectedRole,
      createdClasses: user.createdClasses,
      joinedClasses: user.joinedClasses,
      createdAt: user.createdAt
    });
  } catch (err) {
    console.error("❌ Error in /me route:", err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
});

// ========================
// ✅ TEST EMAIL ENDPOINT (FOR DEBUGGING)
// ========================

router.post("/test-email", async (req, res) => {
  try {
    const testMailOptions = {
      from: {
        name: "Exam System Test",
        address: process.env.EMAIL_USER
      },
      to: process.env.EMAIL_USER,
      subject: "Test Email from Exam System",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #3498db;">Test Email</h2>
          <p>This is a test email from your exam proctoring system.</p>
          <p>If you received this, your email configuration is working correctly!</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        </div>
      `
    };

    await transporter.sendMail(testMailOptions);
    res.json({ 
      success: true, 
      message: "Test email sent successfully! Check your inbox." 
    });
  } catch (error) {
    console.error('❌ Test email failed:', error);
    res.status(500).json({ 
      success: false, 
      message: "Test email failed",
      error: error.message,
      note: "Make sure you're using a Gmail App Password, not your regular Gmail password"
    });
  }
});

// Health check
router.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Auth routes are working",
    googleEnabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS)
  });
});

module.exports = router;
