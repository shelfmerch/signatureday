import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'Group ID is required'],
      index: true
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0
    },
    status: {
      type: String,
      enum: ['initiated', 'succeeded', 'failed'],
      default: 'initiated',
      index: true
    },
    clientSecret: {
      type: String,
      default: 'demo'
    }
  },
  {
    timestamps: true
  }
);

// Indexes for performance
paymentSchema.index({ groupId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;


