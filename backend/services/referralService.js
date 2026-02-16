import Ambassador from '../models/ambassadorModel.js';
import ReferralClick from '../models/referralClickModel.js';
import crypto from 'crypto';

/**
 * Resolve referral code to ambassador
 * @param {string} code - Referral code
 * @returns {Promise<Object|null>} - Ambassador object or null
 */
export const resolveReferralCode = async (code) => {
  if (!code || typeof code !== 'string') {
    return null;
  }

  const normalizedCode = code.trim().toUpperCase();
  const ambassador = await Ambassador.findOne({ referralCode: normalizedCode }).lean();
  return ambassador;
};

/**
 * Set referral cookie on response
 * @param {Object} res - Express response object
 * @param {string} code - Referral code
 */
export const setReferralCookie = (res, code) => {
  const cookieName = process.env.REFERRAL_COOKIE_NAME || 'sd_ref';
  const ttlDays = parseInt(process.env.REFERRAL_COOKIE_TTL_DAYS || '7', 10);
  const domain = process.env.COOKIE_DOMAIN;
  const isProduction = process.env.NODE_ENV === 'production';

  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: ttlDays * 24 * 60 * 60 * 1000 // Convert days to milliseconds
  };

  if (domain) {
    cookieOptions.domain = domain;
  }

  res.cookie(cookieName, code, cookieOptions);
};

/**
 * Get referral code from cookie or request body
 * @param {Object} req - Express request object
 * @returns {string|null} - Referral code or null
 */
export const getReferralCode = (req) => {
  const cookieName = process.env.REFERRAL_COOKIE_NAME || 'sd_ref';

  // Prefer cookie over body for security
  const cookieCode = req.cookies?.[cookieName];
  if (cookieCode) {
    return cookieCode.trim().toUpperCase();
  }

  // Fallback to body (for backward compatibility)
  const bodyCode = req.body?.referralCode;
  if (bodyCode) {
    return bodyCode.trim().toUpperCase();
  }

  return null;
};

/**
 * Clear referral cookie (used after group creation to prevent reuse)
 * @param {Object} res - Express response object
 */
export const clearReferralCookie = (res) => {
  const cookieName = process.env.REFERRAL_COOKIE_NAME || 'sd_ref';
  const domain = process.env.COOKIE_DOMAIN;
  const isProduction = process.env.NODE_ENV === 'production';

  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 0 // Expire immediately
  };

  if (domain) {
    cookieOptions.domain = domain;
  }

  res.cookie(cookieName, '', cookieOptions);
};

/**
 * Record referral click (optional analytics)
 * @param {string} ambassadorId - Ambassador ID
 * @param {string} code - Referral code
 * @param {string} ipHash - Hashed IP address
 * @param {string} uaHash - Hashed user agent
 */
export const recordClick = async (ambassadorId, code, ipHash = null, uaHash = null) => {
  try {
    await ReferralClick.create({
      ambassadorId,
      referralCode: code,
      ipHash: ipHash || null,
      ipHash: ipHash || null,
      uaHash: uaHash || null
    });

    // Increment ambassador total clicks
    await Ambassador.findByIdAndUpdate(ambassadorId, {
      $inc: { referralClicks: 1 }
    });
  } catch (error) {
    // Non-blocking: analytics failures shouldn't break the flow
    console.error('Failed to record referral click:', error);
  }
};

/**
 * Hash IP address for privacy
 * @param {string} ip - IP address
 * @returns {string} - Hashed IP
 */
export const hashIP = (ip) => {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);
};

/**
 * Hash user agent for privacy
 * @param {string} ua - User agent string
 * @returns {string} - Hashed UA
 */
export const hashUserAgent = (ua) => {
  if (!ua) return null;
  return crypto.createHash('sha256').update(ua).digest('hex').substring(0, 16);
};
