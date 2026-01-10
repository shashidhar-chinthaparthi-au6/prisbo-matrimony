import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    // Track who created this profile (vendor/admin or user themselves)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    isVendorCreated: {
      type: Boolean,
      default: false,
    },
    type: {
      type: String,
      enum: ['bride', 'groom'],
      required: true,
    },
    personalInfo: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      dateOfBirth: { type: Date, required: true },
      age: { type: Number },
      height: { type: String }, // e.g., "5'6""
      weight: { type: String },
      bloodGroup: { type: String },
      complexion: { type: String },
      physicalStatus: { type: String }, // Normal, Physically challenged
      maritalStatus: { type: String, default: 'Never Married' },
      motherTongue: { type: String },
      eatingHabits: { type: String }, // Vegetarian, Non-Vegetarian, Vegan
      drinkingHabits: { type: String }, // Yes, No, Occasionally
      smokingHabits: { type: String }, // Yes, No, Occasionally
      about: { type: String },
    },
    familyInfo: {
      fatherName: { type: String },
      fatherOccupation: { type: String },
      motherName: { type: String },
      motherOccupation: { type: String },
      siblings: { type: String },
      familyType: { type: String }, // Joint, Nuclear
      familyStatus: { type: String }, // Middle Class, Upper Middle Class, Rich, Affluent
      familyValues: { type: String },
    },
    education: {
      highestEducation: { type: String },
      college: { type: String },
      degree: { type: String },
      specialization: { type: String },
    },
    career: {
      occupation: { type: String },
      company: { type: String },
      annualIncome: { type: String },
      workingLocation: { type: String },
    },
    location: {
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, default: 'India' },
      pincode: { type: String },
    },
    religion: {
      religion: { type: String },
      caste: { type: String },
      subCaste: { type: String },
      gothra: { type: String },
      star: { type: String },
      raasi: { type: String },
    },
    photos: [
      {
        url: { type: String },
        isPrimary: { type: Boolean, default: false },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    preferences: {
      type: {
        ageRange: {
          min: { type: Number },
          max: { type: Number },
        },
        heightRange: {
          min: { type: String },
          max: { type: String },
        },
        education: [{ type: String }],
        occupation: [{ type: String }],
        location: [{ type: String }],
        religion: { type: String },
        caste: { type: String },
      },
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVisible: {
      type: Boolean,
      default: true, // Show in search by default
    },
    isPremium: {
      type: Boolean,
      default: false,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    profileViews: {
      type: Number,
      default: 0,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
    // Profile Verification
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
    // Soft delete
    deletedAt: {
      type: Date,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Calculate age from dateOfBirth
profileSchema.pre('save', function (next) {
  if (this.personalInfo.dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(this.personalInfo.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    this.personalInfo.age = age;
  }
  next();
});

// Indexes for better search performance
profileSchema.index({ 'location.city': 1 });
profileSchema.index({ 'location.state': 1 });
profileSchema.index({ 'personalInfo.age': 1 });
profileSchema.index({ type: 1 });
profileSchema.index({ isActive: 1 });
profileSchema.index({ createdAt: -1 });
profileSchema.index({ verificationStatus: 1 });
profileSchema.index({ verificationStatus: 1, createdAt: -1 });
profileSchema.index({ createdBy: 1 });
profileSchema.index({ createdBy: 1, createdAt: -1 });
profileSchema.index({ deletedAt: 1 });

export default mongoose.model('Profile', profileSchema);

