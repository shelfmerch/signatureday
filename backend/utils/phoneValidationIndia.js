/**
 * India-only phone validation. Accepts only 10-digit string (no country code).
 * Uses libphonenumber-js and fake-number heuristics.
 */

import { parsePhoneNumberFromString } from 'libphonenumber-js';

const TEN_DIGITS = /^\d{10}$/;

/** Blocked fake/test patterns: all same digit, sequential, common test numbers */
const FAKE_PATTERNS = [
  /^(\d)\1{9}$/,           // 0000000000, 1111111111, ... 9999999999
  /^0123456789$/,         // 0123456789
  /^1234567890$/,        // 1234567890
  /^9876543210$/,        // 9876543210
  /^(\d)(\d)(\d)(\d)(\d)\5{5}$/,  // xxxxxyyyyy (repeated half)
];

function isFakeNumber(phone10) {
  if (!phone10 || typeof phone10 !== 'string') return true;
  const digits = phone10.replace(/\D/g, '');
  if (digits.length !== 10) return true;
  return FAKE_PATTERNS.some(re => re.test(digits));
}

/**
 * Validates 10-digit India mobile number.
 * @param {string} phone10 - Raw input (will be stripped to digits; must be exactly 10 digits)
 * @returns {{ valid: boolean, error?: string }} valid true if valid India mobile; else error message
 */
export function validatePhoneIndia(phone10) {
  if (!phone10 || typeof phone10 !== 'string') {
    return { valid: false, error: 'Invalid phone number' };
  }
  const digits = phone10.replace(/\D/g, '');
  if (!TEN_DIGITS.test(digits)) {
    return { valid: false, error: 'Invalid phone number' };
  }
  if (isFakeNumber(digits)) {
    return { valid: false, error: 'Invalid phone number' };
  }
  const phoneObj = parsePhoneNumberFromString('+91' + digits, 'IN');
  if (!phoneObj || !phoneObj.isPossible() || !phoneObj.isValid()) {
    return { valid: false, error: 'Invalid phone number' };
  }
  return { valid: true };
}

/**
 * Normalize input to 10-digit string or null.
 * @param {string} raw
 * @returns {string|null} 10 digits or null
 */
export function toPhone10(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const digits = raw.replace(/\D/g, '');
  return digits.length === 10 ? digits : null;
}
