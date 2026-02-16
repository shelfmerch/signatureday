import mongoose from 'mongoose';

const otpVerificationSchema = new mongoose.Schema({
  phone: { type: String, required: true, index: true },
  phone10: { type: String, index: true },
  otpHash: { type: String, required: true },
  purpose: { type: String, default: 'generic', index: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  lastSentAt: { type: Date, index: true },
  verified: { type: Boolean, default: false, index: true },
  verifiedAt: { type: Date },
  usedAt: { type: Date },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Automatically purge expired records.
otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('OTPVerification', otpVerificationSchema);






