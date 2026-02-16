import express from 'express';
import {
  createAmbassador,
  getAmbassadorById,
  getAmbassadorByEmail,
  updateAmbassador,
  getAmbassadorStatsEndpoint,
  getAmbassadorSummary,
  getAmbassadorRewards,
  getAmbassadorGroups,
  updatePayoutMethod,
  listAmbassadors,
  listWaitlist,
  // approveWaitlist,
  // listWaitlist,
  approveWaitlist,
  rejectWaitlist,
  loginAmbassador
} from '../controllers/ambassadorController.js';
import { protect, isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public routes
// POST route for creating ambassadors (signup) - must be public
router.post('/', createAmbassador);
router.get('/', protect, isAdmin, listAmbassadors);
router.get('/by-email', getAmbassadorByEmail);
router.post('/login', loginAmbassador);
router.get('/:id', getAmbassadorById);
router.patch('/:id', updateAmbassador);
router.patch('/:id/payout-method', updatePayoutMethod);
router.get('/:id/stats', getAmbassadorStatsEndpoint);
router.get('/:id/summary', getAmbassadorSummary);
router.get('/:id/rewards', getAmbassadorRewards);
router.get('/:id/groups', getAmbassadorGroups);

// Waitlist management routes (admin only)
router.get('/waitlist/list', protect, isAdmin, listWaitlist);
router.post('/waitlist/:id/approve', protect, isAdmin, approveWaitlist);
router.post('/waitlist/:id/reject', protect, isAdmin, rejectWaitlist);

export default router;
