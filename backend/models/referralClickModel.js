import mongoose from 'mongoose';

const referralClickSchema = new mongoose.Schema(
  {
    ambassadorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ambassador',
      required: true,
      index: true
    },
    referralCode: {
      type: String,
      required: true,
      trim: true
    },
    ipHash: {
      type: String,
      trim: true
    },
    uaHash: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes
referralClickSchema.index({ ambassadorId: 1, createdAt: -1 });

// TTL index: automatically delete documents after 90 days
referralClickSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const ReferralClick = mongoose.model('ReferralClick', referralClickSchema);

export default ReferralClick;
