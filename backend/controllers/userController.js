// import User from '../models/userModel.js';
// import generateToken from '../utils/generateToken.js';
// import { validationResult } from 'express-validator';
// import crypto from 'crypto';
// import { sendMail } from '../utils/email.js';
// import Group from '../models/groupModel.js';

// /**
//  * @desc    Register a new user
//  * @route   POST /api/users/register
//  * @access  Public
//  */
// export const registerUser = async (req, res) => {
//   console.log('[Backend] Register request body:', req.body);
//   try {
//     // Check for validation errors
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       console.log('[Backend] Registration Validation Failed:', errors.array());
//       return res.status(400).json({ errors: errors.array() });
//     }

//     const { name, password } = req.body;
//     let { email } = req.body;
    
//     // Enforce lowercase email
//     if (email) email = email.toLowerCase();

//     // Check if user already exists
//     const userExists = await User.findOne({ email });
//     if (userExists) {
//       return res.status(400).json({ message: 'User already exists' });
//     }

//     // Create new user
//     const user = await User.create({
//       name,
//       email,
//       password,
//       isLeader: false
//     });

//     if (user) {
//       res.status(201).json({
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         isAdmin: user.isAdmin,
//         isLeader: user.isLeader,
//         groupId: user.groupId,
//         createdAt: user.createdAt,
//         token: generateToken(user._id)
//       });
//     } else {
//       res.status(400).json({ message: 'Invalid user data' });
//     }
//   } catch (error) {
//     console.error('Register error:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// /**
//  * @desc    Login user & get token
//  * @route   POST /api/users/login
//  * @access  Public
//  */
// export const loginUser = async (req, res) => {
//   try {
//     let { email } = req.body;
//     const { password } = req.body;
    
//     if (email) email = email.toLowerCase();

//     // Find user by email
//     const user = await User.findOne({ email });

//     // Check if user exists and password matches
//     if (user && (await user.matchPassword(password))) {
//       res.json({
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         isAdmin: user.isAdmin,
//         isLeader: user.isLeader,
//         groupId: user.groupId,
//         createdAt: user.createdAt,
//         token: generateToken(user._id)
//       });
//     } else {
//       res.status(401).json({ message: 'Invalid email or password' });
//     }
//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// /**
//  * @desc    Get user profile
//  * @route   GET /api/users/profile
//  * @access  Private
//  */
// export const getUserProfile = async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id);

//     if (user) {
//       res.json({
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         isAdmin: user.isAdmin,
//         isLeader: user.isLeader,
//         groupId: user.groupId,
//         createdAt: user.createdAt
//       });
//     } else {
//       res.status(404).json({ message: 'User not found' });
//     }
//   } catch (error) {
//     console.error('Get profile error:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// /**
//  * @desc    Update user profile
//  * @route   PUT /api/users/profile
//  * @access  Private
//  */
// export const updateUserProfile = async (req, res) => {
//   try {
//     const user = await User.findById(req.user._id);

//     if (user) {
//       user.name = req.body.name || user.name;
//       user.email = req.body.email || user.email;
      
//       // Only update password if provided
//       if (req.body.password) {
//         user.password = req.body.password;
//       }

//       // Update leader status and group ID if provided
//       if (req.body.isLeader !== undefined) {
//         user.isLeader = req.body.isLeader;
//       }
      
//       if (req.body.groupId !== undefined) {
//         user.groupId = req.body.groupId;
//       }

//       const updatedUser = await user.save();

//       res.json({
//         id: updatedUser._id,
//         name: updatedUser.name,
//         email: updatedUser.email,
//         isAdmin: updatedUser.isAdmin,
//         isLeader: updatedUser.isLeader,
//         groupId: updatedUser.groupId,
//         createdAt: updatedUser.createdAt,
//         token: generateToken(updatedUser._id)
//       });
//     } else {
//       res.status(404).json({ message: 'User not found' });
//     }
//   } catch (error) {
//     console.error('Update profile error:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// /**
//  * @desc    Get all users (admin only)
//  * @route   GET /api/users
//  * @access  Private/Admin
//  */
// export const getUsers = async (req, res) => {
//   try {
//     const users = await User.find({}).select('-password');
//     res.json(users);
//   } catch (error) {
//     console.error('Get users error:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// /**
//  * @desc    Get groups owned by a user (most recent first)
//  * @route   GET /api/users/:userId/groups
//  * @access  Private (user themself or admin)
//  */
// export const getUserGroups = async (req, res) => {
//   try {
//     const { userId } = req.params;

//     // Only allow the user themself or an admin to view groups
//     if (!req.user || (String(req.user._id) !== String(userId) && !req.user.isAdmin)) {
//       return res.status(403).json({ message: 'Not authorized to view these groups' });
//     }

//     const groups = await Group.find({ createdByUserId: userId })
//       .sort({ createdAt: -1 })
//       .lean();

//     const items = groups.map((g) => ({
//       id: g._id,
//       name: g.name,
//       yearOfPassing: g.yearOfPassing,
//       totalMembers: g.totalMembers,
//       gridTemplate: g.gridTemplate,
//       createdAt: g.createdAt,
//       status: g.status,
//       referralCode: g.referralCode || null,
//     }));

//     res.json({ items });
//   } catch (error) {
//     console.error('getUserGroups error:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// /**
//  * @desc    Initiate password reset (send email)
//  * @route   POST /api/users/forgot-password
//  * @access  Public
//  */
// export const forgotPassword = async (req, res) => {
//   try {
//     const { email } = req.body;
//     if (!email) return res.status(400).json({ message: 'Email is required' });

//     const user = await User.findOne({ email });
//     // To prevent user enumeration, always respond with success
//     if (!user) {
//       return res.json({ message: 'If that email exists, a reset link has been sent.' });
//     }

//     // Generate reset token
//     const resetToken = crypto.randomBytes(32).toString('hex');
//     const hashed = crypto.createHash('sha256').update(resetToken).digest('hex');
//     const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

//     user.resetPasswordToken = hashed;
//     user.resetPasswordExpires = expires;
//     await user.save();

//     const frontendUrl = process.env.APP_BASE_URL;
//     const link = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

//     await sendMail({
//       to: email,
//       subject: 'Reset your password',
//       html: `<p>You requested a password reset.</p>
//              <p>Click the link below to reset your password. This link will expire in 1 hour.</p>
//              <p><a href="${link}">Reset Password</a></p>
//              <p>If you did not request this, you can ignore this email.</p>`,
//       text: `Reset your password using the following link (valid for 1 hour): ${link}`,
//     });

//     res.json({ message: 'If that email exists, a reset link has been sent.' });
//   } catch (error) {
//     console.error('Forgot password error:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

// /**
//  * @desc    Reset password using token
//  * @route   POST /api/users/reset-password
//  * @access  Public
//  */
// export const resetPassword = async (req, res) => {
//   try {
//     const { email, token, password } = req.body;
//     if (!email || !token || !password) {
//       return res.status(400).json({ message: 'Email, token and new password are required' });
//     }
//     const hashed = crypto.createHash('sha256').update(token).digest('hex');
//     const user = await User.findOne({
//       email,
//       resetPasswordToken: hashed,
//       resetPasswordExpires: { $gt: new Date() },
//     });
//     if (!user) {
//       return res.status(400).json({ message: 'Invalid or expired token' });
//     }

//     user.password = password; // will be hashed by pre-save hook
//     user.resetPasswordToken = null;
//     user.resetPasswordExpires = null;
//     await user.save();

//     res.json({ message: 'Password has been reset successfully' });
//   } catch (error) {
//     console.error('Reset password error:', error);
//     res.status(500).json({ message: 'Server error', error: error.message });
//   }
// };

import User from '../models/userModel.js';
import generateToken from '../utils/generateToken.js';
import { validationResult } from 'express-validator';
import crypto from 'crypto';
import { sendMail } from '../utils/email.js';
import Group from '../models/groupModel.js';

/**
 * @desc    Register a new user
 * @route   POST /api/users/register
 * @access  Public
 */
export const registerUser = async (req, res) => {
  console.log('[Backend] Register request body:', req.body);
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('[Backend] Registration Validation Failed:', errors.array());
      return res.status(400).json({ 
        message: errors.array().map(e => e.msg).join(', '), 
        errors: errors.array() 
      });
    }

    const { name, password } = req.body;
    let { email } = req.body;
    
    // Enforce lowercase email
    if (email) email = email.toLowerCase();

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      isLeader: false
    });

    if (user) {
      res.status(201).json({
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        isLeader: user.isLeader,
        groupId: user.groupId,
        guidesSeen: user.guidesSeen,
        createdAt: user.createdAt,
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Login user & get token
 * @route   POST /api/users/login
 * @access  Public
 */
export const loginUser = async (req, res) => {
  try {
    let { email } = req.body;
    const { password } = req.body;
    
    if (email) email = email.toLowerCase();

    // Find user by email
    const user = await User.findOne({ email });

    // Check if user exists and password matches
    if (user && (await user.matchPassword(password))) {
      res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        isLeader: user.isLeader,
        groupId: user.groupId,
        guidesSeen: user.guidesSeen,
        createdAt: user.createdAt,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        isLeader: user.isLeader,
        groupId: user.groupId,
        guidesSeen: user.guidesSeen,
        createdAt: user.createdAt
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.email = req.body.email || user.email;
      
      // Only update password if provided
      if (req.body.password) {
        user.password = req.body.password;
      }

      // Update leader status and group ID if provided
      if (req.body.isLeader !== undefined) {
        user.isLeader = req.body.isLeader;
      }
      
      if (req.body.groupId !== undefined) {
        user.groupId = req.body.groupId;
      }
      
      if (req.body.guidesSeen !== undefined) {
        user.guidesSeen = { ...user.guidesSeen, ...req.body.guidesSeen };
      }

      const updatedUser = await user.save();

      res.json({
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        isAdmin: updatedUser.isAdmin,
        isLeader: updatedUser.isLeader,
        groupId: updatedUser.groupId,
        guidesSeen: updatedUser.guidesSeen,
        createdAt: updatedUser.createdAt,
        token: generateToken(updatedUser._id)
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/users
 * @access  Private/Admin
 */
export const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Get groups owned by a user (most recent first)
 * @route   GET /api/users/:userId/groups
 * @access  Private (user themself or admin)
 */
export const getUserGroups = async (req, res) => {
  try {
    const { userId } = req.params;

    // Only allow the user themself or an admin to view groups
    if (!req.user || (String(req.user._id) !== String(userId) && !req.user.isAdmin)) {
      return res.status(403).json({ message: 'Not authorized to view these groups' });
    }

    const groups = await Group.find({ createdByUserId: userId })
      .sort({ createdAt: -1 })
      .lean();

    const items = groups.map((g) => ({
      id: g._id,
      name: g.name,
      yearOfPassing: g.yearOfPassing,
      totalMembers: g.totalMembers,
      gridTemplate: g.gridTemplate,
      createdAt: g.createdAt,
      status: g.status,
      referralCode: g.referralCode || null,
    }));

    res.json({ items });
  } catch (error) {
    console.error('getUserGroups error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Initiate password reset (send email)
 * @route   POST /api/users/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email });
    // To prevent user enumeration, always respond with success
    if (!user) {
      return res.json({ message: 'If that email exists, a reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashed = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour

    user.resetPasswordToken = hashed;
    user.resetPasswordExpires = expires;
    await user.save();

    const frontendUrl = process.env.APP_BASE_URL;
    const link = `${frontendUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    await sendMail({
      to: email,
      subject: 'Reset your password',
      html: `<p>You requested a password reset.</p>
             <p>Click the link below to reset your password. This link will expire in 1 hour.</p>
             <p><a href="${link}">Reset Password</a></p>
             <p>If you did not request this, you can ignore this email.</p>`,
      text: `Reset your password using the following link (valid for 1 hour): ${link}`,
    });

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

/**
 * @desc    Reset password using token
 * @route   POST /api/users/reset-password
 * @access  Public
 */
export const resetPassword = async (req, res) => {
  try {
    const { email, token, password } = req.body;
    if (!email || !token || !password) {
      return res.status(400).json({ message: 'Email, token and new password are required' });
    }
    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      email,
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    user.password = password; // will be hashed by pre-save hook
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};