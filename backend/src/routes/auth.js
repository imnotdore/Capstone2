// routes/auth.js - COMPLETE FIXED VERSION
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const User = require("../models/user");
const auth = require("../middleware/authMiddleware");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const router = express.Router();

// ========================
// ✅ EMAIL TRANSPORTER
// ========================

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ========================
// ✅ GOOGLE OAUTH ROUTES - BOTH /auth AND /api/auth
// ========================

// Route 1: /auth/google
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ 
      message: "Google login is currently unavailable. Please use email login." 
    });
  }
  
  console.log('🔐 Initiating Google OAuth via /auth/google...');
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false
  })(req, res, next);
});

// Route 2: /api/auth/google
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
// ✅ GOOGLE CALLBACK ROUTES - BOTH /auth AND /api/auth
// ========================

// Callback 1: /auth/google/callback
router.get('/google/callback', 
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=google_auth_failed`
  }),
  (req, res) => {
    try {
      console.log('✅ Google auth successful for user (/auth route):', req.user.email);
      
      const token = jwt.sign(
        { 
          id: req.user._id, 
          name: req.user.name 
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
  }
);

// Callback 2: /api/auth/google/callback
router.get('/api/auth/google/callback', 
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=google_auth_failed`
  }),
  (req, res) => {
    try {
      console.log('✅ Google auth successful for user (/api/auth route):', req.user.email);
      
      const token = jwt.sign(
        { 
          id: req.user._id, 
          name: req.user.name 
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
  }
);

// ========================
// ✅ OTHER AUTH ROUTES
// ========================

// Registration with OTP
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, username } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already exists" });

    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      username,
      password: hashedPassword,
      isVerified: false,
      verificationToken: otp,
      verificationExpires: otpExpires,
    });

    await user.save();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Email Verification - Exam Proctoring System",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3498db;">Email Verification</h2>
          <p>Hello ${name},</p>
          <p>Thank you for registering with our Exam Proctoring System.</p>
          <p>Your verification code is:</p>
          <div style="background: #f8f9fa; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #2c3e50;">
            ${otp}
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't create an account, please ignore this email.</p>
          <br>
          <p>Best regards,<br>Exam Proctoring Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ 
      message: "Verification code sent to your email", 
      tempId: user._id 
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
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
      return res.status(400).json({ message: "Invalid or expired verification code" });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();

    res.json({ message: "Email verified successfully! You can now login." });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login Route
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email or password" });

    if (!user.password) {
      return res.status(400).json({ 
        message: "Please use Google login for this account" 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    if (!user.isVerified) {
      return res.status(400).json({ 
        message: "Please verify your email first. Check your inbox for the verification code.",
        requiresVerification: true 
      });
    }

    const token = jwt.sign(
      { id: user._id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({ 
      token, 
      user: { 
        id: user._id, 
        name: user.name 
      } 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      isVerified: user.isVerified,
      createdClasses: user.createdClasses,
      joinedClasses: user.joinedClasses,
      createdAt: user.createdAt
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Health check for auth routes
router.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Auth routes are working",
    googleEnabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
  });
});

module.exports = router;