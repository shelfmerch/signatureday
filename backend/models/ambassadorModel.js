import mongoose from 'mongoose';

const ambassadorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    phone: {
      type: String,
      required: [true, 'Phone is required'],
      match: [/^[0-9+\-\s]{8,15}$/, 'Please provide a valid phone number'],
      unique: true,
      trim: true
    },
    referralCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },
    college: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    graduationYear: {
      type: String,
      trim: true
    },
    upiId: {
      type: String,
      trim: true
    },
    payoutMethod: {
      type: {
        type: String,
        enum: ['upi'],
        default: 'upi'
      },
      upiId: {
        type: String,
        trim: true
      },
      updatedAt: {
        type: Date
      }
    },
    totals: {
      rewardsPaid: {
        type: Number,
        default: 0,
        min: 0
      },
      rewardsPending: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    referralClicks: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

// Indexes
ambassadorSchema.index({ referralCode: 1 }, { unique: true });
ambassadorSchema.index({ email: 1 }, { unique: true });
ambassadorSchema.index({ createdAt: -1 });

// Generate unique referral code before validation so required passes
ambassadorSchema.pre('validate', async function (next) {
  if (!this.isNew || this.referralCode) {
    return next();
  }

  try {
    let code;
    let exists = true;
    let attempts = 0;
    const maxAttempts = 10; // Prevent infinite loop

    while (exists && attempts < maxAttempts) {
      // Format: SD-CA-12345
      const randomNum = Math.floor(Math.random() * 90000) + 10000;
      code = `SD-CA-${randomNum}`;
      exists = await this.constructor.findOne({ referralCode: code });
      attempts++;
    }

    if (exists) {
      return next(new Error('Failed to generate unique referral code after multiple attempts'));
    }

    this.referralCode = code;
    next();
  } catch (error) {
    console.error('Error generating referral code:', error);
    next(error);
  }
});

// Virtual for referral link
ambassadorSchema.virtual('referralLink').get(function () {
  const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:8080';
  return `${origin}/ref/${this.referralCode}`;
});

// Ensure virtuals are included in JSON
ambassadorSchema.set('toJSON', { virtuals: true });

const Ambassador = mongoose.model('Ambassador', ambassadorSchema);

export default Ambassador;
