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
  },
  {
    timestamps: true,
  }
);

// Ensure one chat per pair
chatSchema.index({ participants: 1 }, { unique: true });

export default mongoose.model('Chat', chatSchema);

