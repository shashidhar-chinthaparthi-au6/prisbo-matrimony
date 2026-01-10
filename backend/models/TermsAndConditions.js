import mongoose from 'mongoose';

const termsAndConditionsSchema = new mongoose.Schema(
  {
    version: {
      type: String,
      required: true,
      unique: true,
    },
    content: {
      type: String,
      required: true,
    },
    forRole: {
      type: String,
      enum: ['user', 'vendor', 'all'],
      default: 'all',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for active terms by role
termsAndConditionsSchema.index({ forRole: 1, isActive: 1 });

export default mongoose.model('TermsAndConditions', termsAndConditionsSchema);

