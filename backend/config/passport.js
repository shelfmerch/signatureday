import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/userModel.js';

export const configurePassport = () => {
  // Configure Google Strategy if credentials are available
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log('Configuring Google OAuth strategy');
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://signaturedaytshirt.com/api/auth/google/callback',
          proxy: true,
        },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists
          let user = await User.findOne({ email: profile.emails[0].value });
          
          if (user) {
            // If user exists but was registered with password, update with Google ID
            if (!user.googleId) {
              user.googleId = profile.id;
              await user.save();
            }
            return done(null, user);
          }
          
          // Create new user if doesn't exist
          user = await User.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            password: Math.random().toString(36).slice(-12), // Random password for Google auth users
            googleId: profile.id,
            isLeader: false,
            profileImage: profile.photos && profile.photos[0] ? profile.photos[0].value : undefined
          });
          
          return done(null, user);
        } catch (error) {
          console.error('Google auth error:', error);
          return done(error, false);
        }
      }
    )
  );
  } else {
    console.log('Google OAuth credentials not found. Google authentication is disabled.');
  }

  // Serialize user for session
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};

export default configurePassport;
