/**
 * Rate limits for OTP. In-memory store (swap to Redis for multi-instance).
 * - Per IP: max 10 requests per 10 minutes for POST /send
 * - Per-phone10 limit (3 per 15 min) is enforced in controller via DB count.
 */

import rateLimit from 'express-rate-limit';

const WINDOW_MS = 10 * 60 * 1000;   // 10 minutes
const MAX_PER_IP = 10;

const otpSendByIpLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_PER_IP,
  message: { ok: false, error: 'Too many OTP requests. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || req.socket?.remoteAddress || 'unknown'
});

export { otpSendByIpLimiter };
