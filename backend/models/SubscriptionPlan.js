import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: ['1 Month', '3 Months', '6 Months', '12 Months'],
    },
    duration: {
      type: Number,
      required: true,
      enum: [30, 90, 180, 365], // days
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

