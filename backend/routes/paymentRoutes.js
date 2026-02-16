import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { 
  getKey, 
  createRazorpayOrder, 
  verifyPayment,
  verifyPaymentAndJoin,
  createPaymentIntent,
  confirmPayment
} from '../controllers/paymentController.js';

const router = express.Router();

// Public routes
router.get('/key', getKey); // Get Razorpay public key (safe to be public)
router.post('/join/order', createRazorpayOrder);
router.post('/join/verify', verifyPaymentAndJoin);

// Checkout flow routes (requires user auth)
router.post('/order', protect, createRazorpayOrder);
router.post('/verify', protect, verifyPayment);

// Demo payment flow routes
router.post('/intent', protect, createPaymentIntent);
router.post('/confirm', protect, confirmPayment);

export default router;


