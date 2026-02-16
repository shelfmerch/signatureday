import express from 'express';
import { sendOtp, verifyOtp, statusByPhone } from '../controllers/otpController.js';
import { otpSendByIpLimiter } from '../middleware/rateLimits.js';

const router = express.Router();

router.post('/send', otpSendByIpLimiter, sendOtp);
router.post('/verify', verifyOtp);
router.get('/status/:phone', statusByPhone);

export default router;






