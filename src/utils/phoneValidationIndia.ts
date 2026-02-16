/**
 * India-only phone validation (10-digit). Uses libphonenumber-js and fake-number heuristics.
 */

import { parsePhoneNumberFromString } from 'libphonenumber-js';

const TEN_DIGITS = /^\d{10}$/;

const FAKE_PATTERNS: RegExp[] = [
  /^(\d)\1{9}$/,           // 0000000000 ... 9999999999
  /^0123456789$/,
  /^1234567890$/,
  /^9876543210$/,
  /^(\d)(\d)(\d)(\d)(\d)\5{5}$/,  // xxxxxyyyyy
];

function isFakeNumber(phone10: string): boolean {
  const digits = phone10.replace(/\D/g, '');
  if (digits.length !== 10) return true;
  return FAKE_PATTERNS.some((re) => re.test(digits));
}

export function validatePhoneIndia(phone10: string): { valid: boolean; error?: string } {
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

export function toPhone10(raw: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const digits = raw.replace(/\D/g, '');
  return digits.length === 10 ? digits : null;
}
