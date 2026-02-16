import express from 'express';
import { createReward, updateRewardStatus, getRewards } from '../controllers/rewardController.js';
import { protect, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Create reward (internal/service endpoint - can be called by order completion)
router.post('/create', createReward);

// Admin routes
router.get('/', protect, isAdmin, getRewards);
router.patch('/:id', protect, isAdmin, updateRewardStatus);

export default router;
