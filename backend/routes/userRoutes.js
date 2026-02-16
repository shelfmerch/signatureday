import express from 'express';
import { check } from 'express-validator';
import { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  updateUserProfile,
  getUsers,
  forgotPassword,
  resetPassword,
  getUserGroups
} from '../controllers/userController.js';
import { protect, isLeader, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Registration validation
const registerValidation = [
  check('name', 'Name is required').not().isEmpty(),
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password must be at least 6 characters').isLength({ min: 6 })
];

// Login validation
const loginValidation = [
  check('email', 'Please include a valid email').isEmail(),
  check('password', 'Password is required').exists()
];

// Public routes
router.post('/register', registerValidation, registerUser);
router.post('/login', loginValidation, loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

// Admin routes
router.get('/', protect, isAdmin, getUsers);

// User groups
router.get('/:userId/groups', protect, getUserGroups);

export default router;

