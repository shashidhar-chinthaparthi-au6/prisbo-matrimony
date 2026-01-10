import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'interest_sent',
        'interest_accepted',
        'interest_rejected',
        'new_message',
        'profile_view',
        'support_message',
        'profile_approved',
        'profile_rejected',
        'subscription_approved',
        'subscription_rejected',
        'vendor_created',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    relatedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    relatedProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
    },
    relatedChatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
    },
    relatedInterestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interest',
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

export default mongoose.model('Notification', notificationSchema);

