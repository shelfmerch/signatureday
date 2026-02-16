import mongoose from 'mongoose';

const ambassadorWaitlistSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    reviewedAt: {
      type: Date
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectionReason: {
      type: String,
      trim: true
    },
    ambassadorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ambassador',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes
ambassadorWaitlistSchema.index({ email: 1 }, { unique: true });
ambassadorWaitlistSchema.index({ phone: 1 }, { unique: true });
ambassadorWaitlistSchema.index({ status: 1, createdAt: -1 });
ambassadorWaitlistSchema.index({ createdAt: -1 });

const AmbassadorWaitlist = mongoose.model('AmbassadorWaitlist', ambassadorWaitlistSchema);

export default AmbassadorWaitlist;




