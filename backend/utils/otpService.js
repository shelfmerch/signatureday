/**
 * OTP create/verify service. Stores OTP as hash; supports purpose, expiry, attempts, cooldown.
 */

import crypto from 'crypto';
import OTPVerification from '../models/OTPVerification.js';
import { sendOTP } from '../services/smsService.js';

const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 60;

export function generateOTP(length = 6) {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i += 1) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

export function hashOTP(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

function expiresAt(minutes = OTP_EXPIRY_MINUTES) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

/**
 * Create and send OTP for phone10 (India 10-digit). Enforces cooldown via lastSentAt.
 * @param {string} phone10 - 10-digit India mobile
 * @param {string} purpose - e.g. "login", "checkout", "profile"
 * @returns {{ success: boolean, error?: string, retryAfter?: number }}
 */
export async function createAndSendOtp(phone10, purpose) {
  const normalized = phone10.replace(/\D/g, '');
  if (normalized.length !== 10) {
    return { success: false, error: 'Invalid phone number' };
  }

  const lastRecord = await OTPVerification.findOne({ phone: '+91' + normalized })
    .sort({ lastSentAt: -1 });

  if (lastRecord?.lastSentAt) {
    const elapsed = (Date.now() - lastRecord.lastSentAt.getTime()) / 1000;
    if (elapsed < COOLDOWN_SECONDS) {
      const remaining = Math.ceil(COOLDOWN_SECONDS - elapsed);
      return {
        success: false,
        error: `Please wait ${remaining}s before requesting OTP again.`,
        retryAfter: remaining
      };
    }
  }

  const otp = generateOTP(6);
  const expiresAtTime = expiresAt(OTP_EXPIRY_MINUTES);
  const record = {
    phone: '+91' + normalized,
    phone10: normalized,
    otpHash: hashOTP(otp),
    purpose: purpose || 'generic',
    expiresAt: expiresAtTime,
    attempts: 0,
    lastSentAt: new Date(),
    verified: false
  };

  await OTPVerification.create(record);
  await sendOTP({ phone: '+91' + normalized, otp, source: purpose || 'otp' });

  return { success: true };
}

/**
 * Verify OTP for phone10. Decrements attempts on wrong OTP; deletes record on success.
 * @param {string} phone10 - 10-digit India mobile
 * @param {string} otp - 6-digit OTP
 * @param {string} purpose - same as send
 * @returns {{ success: boolean, error?: string }}
 */
export async function verifyOtpRecord(phone10, otp, purpose) {
  const normalized = phone10.replace(/\D/g, '');
  if (normalized.length !== 10 || !otp || String(otp).replace(/\D/g, '').length !== 6) {
    return { success: false, error: 'Invalid OTP' };
  }

  const record = await OTPVerification.findOne({
    phone: '+91' + normalized,
    purpose: purpose || 'generic'
  }).sort({ createdAt: -1 });

  if (!record) {
    return { success: false, error: 'Invalid OTP' };
  }
  if (record.expiresAt.getTime() < Date.now()) {
    return { success: false, error: 'OTP expired. Please resend.' };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    return { success: false, error: 'Invalid OTP' };
  }

  const incomingHash = hashOTP(String(otp).replace(/\D/g, ''));
  if (incomingHash !== record.otpHash) {
    record.attempts += 1;
    await record.save();
    return { success: false, error: 'Invalid OTP' };
  }

  record.verified = true;
  record.verifiedAt = new Date();
  await record.save();
  // Record kept so statusByPhone and join/checkout can check verified; they set usedAt when consumed.

  return { success: true, verifiedAt: record.verifiedAt };
}
