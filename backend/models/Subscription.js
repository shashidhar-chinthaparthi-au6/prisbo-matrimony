import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
    },
    planName: {
      type: String,
      required: true,
    },
    planDuration: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ['upi', 'cash', 'mixed'],
    },
    // UPI Payment Details
    upiScreenshot: {
      type: String,
    },
    upiTransactionId: {
      type: String,
    },
    upiAmount: {
      type: Number,
      default: 0,
    },
    // Cash Payment Details
    cashAmount: {
      type: Number,
      default: 0,
    },
    cashReceivedDate: {
      type: Date,
    },
    cashReceivedBy: {
      type: String,
    },
    // Status
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'expired', 'cancelled'],
      default: 'pending',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    // Admin Approval
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ status: 1, createdAt: -1 });
subscriptionSchema.index({ endDate: 1 });
subscriptionSchema.index({ approvedBy: 1 });

export default mongoose.model('Subscription', subscriptionSchema);

