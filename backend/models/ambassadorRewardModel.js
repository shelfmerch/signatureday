import mongoose from 'mongoose';

const ambassadorRewardSchema = new mongoose.Schema(
  {
    ambassadorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ambassador',
      required: [true, 'Ambassador ID is required'],
      index: true
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'Group ID is required']
    },
    groupNameSnapshot: {
      type: String,
      required: true,
      trim: true
    },
    memberCountSnapshot: {
      type: Number,
      required: true,
      min: 0
    },
    rewardAmount: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['pending', 'paid'],
      default: 'pending',
      index: true
    },
    orderValue: {
      type: Number,
      min: 0
    },
    paidAt: {
      type: Date
    },
    paidTxRef: {
      type: String,
      trim: true
    },
    paidVia: {
      type: String,
      trim: true
    },
    tierVersion: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// Indexes for performance
ambassadorRewardSchema.index({ ambassadorId: 1, createdAt: -1 });
ambassadorRewardSchema.index({ status: 1, createdAt: -1 });
ambassadorRewardSchema.index({ ambassadorId: 1, groupId: 1 }, { unique: true }); // Idempotency

// Set paidAt when status changes to 'paid'
ambassadorRewardSchema.pre('save', function (next) {
  if (this.isModified('status') && this.status === 'paid' && !this.paidAt) {
    this.paidAt = new Date();
  }
  next();
});

const AmbassadorReward = mongoose.model('AmbassadorReward', ambassadorRewardSchema);

export default AmbassadorReward;
