import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

/**
 * Protect routes - Middleware to verify JWT token and attach user to request
 */
export const protect = async (req, res, next) => {
  let token;

  // 1) Try Authorization: Bearer <token>
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 2) Fallback to cookies (httpOnly)
  if (!token && req.cookies) {
    token = req.cookies.token || req.cookies.jwt || null;
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production');
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }
    next();
  } catch (error) {
    console.error('protect middleware error:', error);
    res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

/**
 * Check if user is a group leader
 */
export const isLeader = (req, res, next) => {
  if (req.user && (req.user.isLeader || req.user.isAdmin)) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as a leader' });
  }
};

/**
 * Check if user is an admin
 */
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized as an admin' });
  }
};

/**
 * Check if user belongs to the specified group
 */
export const belongsToGroup = (req, res, next) => {
  if (req.user && req.user.groupId === req.params.groupId) {
    next();
  } else {
    res.status(403).json({ message: 'Not authorized to access this group' });
  }
};


