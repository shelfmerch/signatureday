import express from 'express';
import passport from 'passport';
import generateToken from '../utils/generateToken.js';

const router = express.Router();

// Google OAuth routes
router.get('/google', (req, res, next) => {
  // Check if Google strategy is configured
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ 
      message: 'Google authentication is not configured', 
      error: 'Missing Google OAuth credentials' 
    });
  }
  
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  // Check if Google strategy is configured
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ 
      message: 'Google authentication is not configured', 
      error: 'Missing Google OAuth credentials' 
    });
  }
  
  passport.authenticate('google', { session: false, failureRedirect: '/login' })(req, res, (err) => {
    if (err) {
      return res.redirect('/login?error=auth_failed');
    }
    try {
      // Generate JWT token
      const token = generateToken(req.user._id);
      
      // Redirect to frontend with token
      const frontendUrl = process.env.APP_BASE_URL || 'http://localhost:8080';
      res.redirect(`${frontendUrl}/auth/google/success?token=${token}`);
    } catch (error) {
      console.error('Google auth callback error:', error);
      res.redirect('/login?error=auth_failed');
    }
  });
});

export default router;
