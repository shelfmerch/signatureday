import express from 'express';
import { trackReferral, resolveReferral, getMyReferralGroup } from '../controllers/referralController.js';
import { protect } from '../middleware/authMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for referral tracking (10 requests per minute per IP)
const referralRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many referral tracking requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});

// Public routes
router.post('/track', referralRateLimit, trackReferral);
router.get('/code/:code', resolveReferral);

// Authenticated routes
router.get('/:code/my-group', protect, getMyReferralGroup);

export default router;
