import Profile from '../models/Profile.js';

/**
 * Middleware to check if user's profile is approved
 * Blocks access if profile is pending or rejected
 */
export const requireApprovedProfile = async (req, res, next) => {
  // Super admins bypass profile verification checks
  if (req.user && req.user.role === 'super_admin') {
    return next();
  }

  const user = req.user;

  // Check if user has a profile
  const profile = await Profile.findOne({ userId: user._id });

  if (!profile) {
    return res.status(403).json({
      success: false,
      message: 'Profile not found. Please create your profile first.',
      requiresProfile: true,
    });
  }

  // Check verification status
  if (profile.verificationStatus === 'pending') {
    return res.status(403).json({
      success: false,
      message: 'Your profile is pending verification. Please wait for admin approval.',
      verificationStatus: 'pending',
    });
  }

  if (profile.verificationStatus === 'rejected') {
    return res.status(403).json({
      success: false,
      message: profile.rejectionReason || 'Your profile has been rejected. Please update your profile and resubmit for verification.',
      verificationStatus: 'rejected',
    });
  }

  if (profile.verificationStatus !== 'approved') {
    return res.status(403).json({
      success: false,
      message: 'Your profile is not verified. Please contact support.',
      verificationStatus: profile.verificationStatus,
    });
  }

  req.profile = profile;
  next();
};

