import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      trim: true,
    },
    lastName: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Please add a phone number'],
      unique: true,
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'super_admin', 'vendor'],
      default: 'user',
    },
    // Vendor-specific fields
    companyName: {
      type: String,
    },
    vendorContactInfo: {
      type: String,
    },
    vendorAddress: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      pincode: { type: String },
      country: { type: String, default: 'India' },
    },
    vendorLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    vendorProofs: {
      businessRegistration: { type: String }, // URL to document
      gstCertificate: { type: String }, // URL to document
      panCard: { type: String }, // URL to document
      aadharCard: { type: String }, // URL to document
      otherDocuments: [{ type: String }], // Array of URLs
    },
    vendorBusinessDetails: {
      businessType: { type: String }, // e.g., "Wedding Planner", "Photographer", etc.
      registrationNumber: { type: String },
      gstNumber: { type: String },
      panNumber: { type: String },
      yearEstablished: { type: Number },
      description: { type: String },
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeactivated: {
      type: Boolean,
      default: false,
    },
    deactivatedAt: {
      type: Date,
    },
    deactivationReason: {
      type: String,
    },
    privacySettings: {
      showEmail: { type: Boolean, default: false },
      showPhone: { type: Boolean, default: false },
      showProfileInSearch: { type: Boolean, default: true },
      allowProfileViews: { type: Boolean, default: true },
    },
    profileType: {
      type: String,
      enum: ['bride', 'groom'],
    },
    registeredViaVendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastChatSectionAccess: {
      type: Date,
    },
    blockedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
    },
    subscriptionStatus: {
      type: String,
      enum: ['active', 'expired', 'pending', 'none'],
      default: 'none',
    },
    subscriptionExpiryDate: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpire: {
      type: Date,
      select: false,
    },
    termsAccepted: {
      type: Boolean,
      default: false,
    },
    termsAcceptedAt: {
      type: Date,
    },
    termsVersion: {
      type: String,
      default: '1.0',
    },
    notificationPreferences: {
      email: {
        interest: { type: Boolean, default: true },
        message: { type: Boolean, default: true },
        profile: { type: Boolean, default: true },
        subscription: { type: Boolean, default: true },
        support: { type: Boolean, default: true },
      },
      push: {
        interest: { type: Boolean, default: true },
        message: { type: Boolean, default: true },
        profile: { type: Boolean, default: true },
        subscription: { type: Boolean, default: true },
        support: { type: Boolean, default: true },
      },
      sound: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);

