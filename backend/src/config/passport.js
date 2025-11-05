// config/passport.js - UPDATED
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user");

// Serialization
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  console.log("✅ Initializing Google OAuth strategy...");
  
  // ✅ FIXED: Use proper callback URL
  const callbackURL = process.env.NODE_ENV === 'production' 
    ? `${process.env.BACKEND_URL}/api/auth/google/callback`
    : `http://localhost:3000/api/auth/google/callback`;
  
  console.log('🔗 Google Callback URL:', callbackURL);
  
  // config/passport.js - UPDATED
// ... existing code ...

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: callbackURL
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('🔍 Google OAuth Profile Received:', profile.id);
      
      let user = await User.findOne({ googleId: profile.id });
      if (user) {
        console.log('✅ Existing Google user found:', user.email);
        return done(null, user);
      }
      
      user = await User.findOne({ email: profile.emails[0].value });
      if (user) {
        console.log('✅ Existing email user found, linking Google ID');
        user.googleId = profile.id;
        await user.save();
        return done(null, user);
      }
      
      console.log('🆕 Creating new Google user:', profile.emails[0].value);
      user = await User.create({
        googleId: profile.id,
        name: profile.displayName,
        email: profile.emails[0].value,
        isVerified: true
        // ❌ REMOVED: role assignment
      });
      
      console.log('✅ New user created:', user.email);
      return done(null, user);
    } catch (error) {
      console.error('❌ Google OAuth error:', error);
      return done(error, null);
    }
  }
));
  
  console.log("✅ Google OAuth strategy registered successfully");
} else {
  console.warn("⚠️  Google OAuth credentials not found. Google login disabled.");
}

module.exports = passport;