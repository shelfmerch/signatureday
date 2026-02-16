import express from 'express';
import { check } from 'express-validator';
import {
  createGroup,
  getGroups,
  getGroupById,
  getGroupMembers,
  joinGroup,
  joinGroupPaid,
  updateGroupTemplate,
  updateGroup,
  deleteGroup
} from '../controllers/groupController.js';
import { protect, isLeader } from '../middleware/authMiddleware.js';

const router = express.Router();

// Group creation validation
const createGroupValidation = [
  check('name', 'Group name is required').not().isEmpty(),
  check('yearOfPassing', 'Year of passing is required').not().isEmpty(),
  check('totalMembers', 'Total members must be a positive number').isInt({ min: 1 })
];

// Join group validation
const joinGroupValidation = [
  check('name', 'Name is required').not().isEmpty(),
  check('memberRollNumber', 'Member roll number is required').not().isEmpty(),
  check('photo', 'Photo is required').not().isEmpty(),
  check('vote', 'Vote must be one of: hexagonal, square, circle').isIn(['hexagonal', 'square', 'circle']),
  check('phone', 'Phone number is required').not().isEmpty()
];

// Protected routes that require authentication
router.post('/', protect, createGroupValidation, createGroup);
router.get('/', protect, isLeader, getGroups);
router.get('/:id', getGroupById); // Public for sharing
router.get('/:id/members', getGroupMembers); // Get paginated members
router.post('/:id/join', joinGroupValidation, joinGroup);
router.post('/:id/join-paid', protect, joinGroupPaid);
// Make template update accessible without auth for better performance
router.put('/:id/template', updateGroupTemplate);
router.put('/:id', protect, isLeader, updateGroup);
router.delete('/:id', protect, isLeader, deleteGroup);

export default router;