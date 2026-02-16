import express from 'express';
import { protect, isAdmin } from '../middleware/authMiddleware.js';
import {
  getAdminStats,
  markPayoutPaid,
  listAmbassadorsWithGroups,
  listAmbassadorGroupsAdmin,
  listDirectGroups,
  getGroupWithParticipants
} from '../controllers/adminController.js';

const router = express.Router();

router.get('/stats', protect, isAdmin, getAdminStats);
// New canonical route for manual payouts
router.post('/rewards/:rewardId/pay', protect, isAdmin, markPayoutPaid);
// Backwards-compatible legacy route
router.post('/payouts/:rewardId/mark-paid', protect, isAdmin, markPayoutPaid);

// Manage Groups (admin only)
router.get('/manage-groups/ambassadors', protect, isAdmin, listAmbassadorsWithGroups);
router.get('/manage-groups/ambassadors/:ambassadorId/groups', protect, isAdmin, listAmbassadorGroupsAdmin);
router.get('/manage-groups/direct', protect, isAdmin, listDirectGroups);
router.get('/manage-groups/group/:groupId', protect, isAdmin, getGroupWithParticipants);

export default router;
