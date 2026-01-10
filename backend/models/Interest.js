import mongoose from 'mongoose';

const interestSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    message: {
      type: String,
    },
    expiresAt: {
      type: Date,
      default: function() {
        // Default expiry: 30 days from creation
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        return expiryDate;
      },
    },
    expired: {
      type: Boolean,
      default: false,
    },
    expiredAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one interest per pair
interestSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });

export default mongoose.model('Interest', interestSchema);

