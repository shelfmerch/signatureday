import crypto from 'crypto';

export const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i += 1) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
};

export const hashOTP = (otp) =>
  crypto.createHash('sha256').update(String(otp)).digest('hex');

export const generateExpiryTime = (minutes = 10) =>
  new Date(Date.now() + minutes * 60 * 1000);

export const standardizePhoneNumber = (rawPhone) => {
  if (!rawPhone) return null;
  const digits = rawPhone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+91${digits.slice(1)}`;
  }
  if (digits.startsWith('91') && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.length >= 11) {
    return `+${digits}`;
  }
  return null;
};






