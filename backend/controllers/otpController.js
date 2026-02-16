import OTPVerification from '../models/OTPVerification.js';
import { validatePhoneIndia } from '../utils/phoneValidationIndia.js';
import { createAndSendOtp, verifyOtpRecord } from '../utils/otpService.js';

const VERIFIED_MAX_AGE_MINUTES = Number(process.env.OTP_VERIFIED_MAX_AGE_MINUTES || 30);
const PHONE_SEND_WINDOW_MINUTES = 15;
const PHONE_SEND_MAX = 3;

function getClientIp(req) {
  return req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}

function getClientUserAgent(req) {
  return req.get('User-Agent') || '';
}

function logOtpRequest(phone10, ip, userAgent, purpose, result) {
  console.log(
    `[OTP] phone10=${phone10} ip=${ip} purpose=${purpose || 'generic'} result=${result} ua=${userAgent?.slice(0, 80) || ''}`
  );
}

/**
 * POST /api/otp/send
 * Body: { phone10: string, purpose?: string }
 * - Validates India 10-digit only; cooldown 60s; per-phone 3/15min; per-IP via middleware.
 */
export const sendOtp = async (req, res) => {
  const ip = getClientIp(req);
  const userAgent = getClientUserAgent(req);
  try {
    const { phone10, purpose = 'generic' } = req.body || {};
    const digits = typeof phone10 === 'string' ? phone10.replace(/\D/g, '') : '';
    if (!/^\d{10}$/.test(digits)) {
      logOtpRequest(phone10 || '', ip, userAgent, purpose, 'invalid');
      return res.status(400).json({ ok: false, error: 'Invalid phone number' });
    }

    const validation = validatePhoneIndia(digits);
    if (!validation.valid) {
      logOtpRequest(digits, ip, userAgent, purpose, 'invalid');
      return res.status(400).json({ ok: false, error: validation.error || 'Invalid phone number' });
    }

    const countLast15 = await OTPVerification.countDocuments({
      phone10: digits,
      lastSentAt: { $gte: new Date(Date.now() - PHONE_SEND_WINDOW_MINUTES * 60 * 1000) }
    });
    if (countLast15 >= PHONE_SEND_MAX) {
      logOtpRequest(digits, ip, userAgent, purpose, 'blocked');
      return res.status(429).json({ ok: false, error: 'Too many OTP requests. Try again later.' });
    }

    const result = await createAndSendOtp(digits, purpose);
    if (!result.success) {
      if (result.retryAfter) {
        logOtpRequest(digits, ip, userAgent, purpose, 'cooldown');
        return res.status(429).json({
          ok: false,
          error: result.error,
          retryAfter: result.retryAfter
        });
      }
      logOtpRequest(digits, ip, userAgent, purpose, 'blocked');
      return res.status(400).json({ ok: false, error: result.error || 'Invalid phone number' });
    }

    logOtpRequest(digits, ip, userAgent, purpose, 'sent');
    return res.status(200).json({
      ok: true,
      message: 'OTP sent successfully'
    });
  } catch (error) {
    console.error('[OTP] send error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to send OTP' });
  }
};

/**
 * POST /api/otp/verify
 * Body: { phone10: string, otp: string, purpose?: string }
 */
export const verifyOtp = async (req, res) => {
  try {
    const { phone10, otp, purpose = 'generic' } = req.body || {};
    const digits = typeof phone10 === 'string' ? phone10.replace(/\D/g, '') : '';
    if (!/^\d{10}$/.test(digits)) {
      return res.status(400).json({ ok: false, error: 'Invalid phone number' });
    }
    if (!otp || String(otp).replace(/\D/g, '').length !== 6) {
      return res.status(400).json({ ok: false, error: 'Invalid OTP' });
    }

    const result = await verifyOtpRecord(digits, otp, purpose);
    if (!result.success) {
      return res.status(400).json({ ok: false, error: result.error });
    }
    return res.status(200).json({
      ok: true,
      message: 'OTP verified successfully',
      verifiedAt: result.verifiedAt
    });
  } catch (error) {
    console.error('[OTP] verify error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to verify OTP' });
  }
};

/**
 * GET /api/otp/status/:phone
 * Accepts 10-digit or +91...; returns verified status within VERIFIED_MAX_AGE.
 */
export const statusByPhone = async (req, res) => {
  try {
    let raw = req.params.phone || '';
    const digits = raw.replace(/\D/g, '');
    const normalized = digits.length === 10 ? '+91' + digits : digits.length === 12 && digits.startsWith('91') ? '+' + digits : null;
    if (!normalized) {
      return res.status(400).json({ ok: false, verified: false });
    }

    const record = await OTPVerification.findOne({ phone: normalized })
      .sort({ verifiedAt: -1 });

    if (!record || !record.verified) {
      return res.status(404).json({ ok: false, verified: false });
    }
    if (!record.verifiedAt || (Date.now() - record.verifiedAt.getTime()) > VERIFIED_MAX_AGE_MINUTES * 60 * 1000) {
      return res.status(404).json({ ok: false, verified: false });
    }
    return res.status(200).json({
      ok: true,
      verified: true,
      verifiedAt: record.verifiedAt,
      usedAt: record.usedAt || null
    });
  } catch (error) {
    console.error('[OTP] status error:', error);
    return res.status(500).json({ ok: false });
  }
};
