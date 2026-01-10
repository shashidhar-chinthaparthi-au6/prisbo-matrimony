import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],
    chatType: {
      type: String,
      enum: ['user_to_user', 'support_superadmin_vendor', 'support_superadmin_user', 'support_vendor_user'],
      default: 'user_to_user',
    },
    lastMessage: {
      type: String,
    },
    lastMessageAt: {
      type: Date,
    },
    lastViewedBy: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    typingUsers: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      typingUntil: {
        type: Date,
      },
    }],
  },
  {
    timestamps: true,
  }
);

// Ensure one chat per pair for user_to_user chats
// Support chats can have multiple chats between same participants
chatSchema.index({ participants: 1, chatType: 1 });

export default mongoose.model('Chat', chatSchema);

