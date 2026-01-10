import mongoose from 'mongoose';

const favoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      required: true,
    },
    notes: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      default: 'general',
    },
  },
  {
    timestamps: true,
  }
);

// Ensure one favorite per user-profile pair
favoriteSchema.index({ userId: 1, profileId: 1 }, { unique: true });

export default mongoose.model('Favorite', favoriteSchema);

