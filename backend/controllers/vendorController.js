import Profile from '../models/Profile.js';
import User from '../models/User.js';

// @desc    Create profile for a person (vendor creates profile for someone else)
// @route   POST /api/vendor/profiles
// @access  Private/Vendor
export const createProfileForPerson = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const profileData = req.body;

    // Validate required fields
    if (!profileData.personalInfo?.firstName || !profileData.personalInfo?.lastName) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name are required',
      });
    }
    if (!profileData.personalInfo?.dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: 'Date of birth is required',
      });
    }
    if (!profileData.location?.city || !profileData.location?.state) {
      return res.status(400).json({
        success: false,
        message: 'City and state are required',
      });
    }
    if (!profileData.type) {
      return res.status(400).json({
        success: false,
        message: 'Profile type (bride/groom) is required',
      });
    }

    // Check if userId is provided (person might have an account)
    let userId = profileData.userId;
    
    // If userId is not provided, we need to create a user account for the person
    // For now, we'll require userId to be provided or create a minimal user
    if (!userId) {
      // Create a user account for the person
      // Use email/phone from profileData or generate temporary ones
      const email = profileData.email || `temp_${Date.now()}@vendor.created`;
      const phone = profileData.phone || `temp_${Date.now()}`;
      const password = profileData.password || `temp_${Date.now()}`;

      const newUser = await User.create({
        email,
        phone,
        password,
        role: 'user',
        profileType: profileData.type,
      });

      userId = newUser._id;
    } else {
      // Verify the user exists
      const existingUser = await User.findById(userId);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }
    }

    // Check if profile already exists for this user
    const existingProfile = await Profile.findOne({ userId });
    if (existingProfile) {
      return res.status(400).json({
        success: false,
        message: 'Profile already exists for this user',
      });
    }

    // Clean preferences
    let cleanedPreferences = {};
    if (profileData.preferences) {
      Object.keys(profileData.preferences).forEach((key) => {
        if (key === 'ageRange' || key === 'heightRange') {
          const range = profileData.preferences[key];
          if (range && typeof range === 'object') {
            const cleaned = {};
            if (range.min !== undefined) cleaned.min = range.min;
            if (range.max !== undefined) cleaned.max = range.max;
            if (Object.keys(cleaned).length > 0) {
              cleanedPreferences[key] = cleaned;
            }
          }
        } else if (profileData.preferences[key] !== undefined && profileData.preferences[key] !== null) {
          cleanedPreferences[key] = profileData.preferences[key];
        }
      });
    }

    // Create profile
    const profile = await Profile.create({
      userId,
      createdBy: vendorId, // Track that vendor created this
      isVendorCreated: true,
      ...profileData,
      preferences: Object.keys(cleanedPreferences).length > 0 ? cleanedPreferences : {},
      verificationStatus: 'pending',
    });

    res.status(201).json({
      success: true,
      profile,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message).join(', ');
      return res.status(400).json({
        success: false,
        message: `Profile validation failed: ${messages}`,
      });
    }
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all profiles created by vendor
// @route   GET /api/vendor/profiles
// @access  Private/Vendor
export const getMyProfiles = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { page = 1, limit = 20, search, type, isActive } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { createdBy: vendorId };
    
    if (search) {
      query.$or = [
        { 'personalInfo.firstName': new RegExp(search, 'i') },
        { 'personalInfo.lastName': new RegExp(search, 'i') },
      ];
    }
    if (type) {
      query.type = type;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const profiles = await Profile.find(query)
      .populate('userId', 'email phone')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Profile.countDocuments(query);

    res.status(200).json({
      success: true,
      profiles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get specific profile (with ownership check)
// @route   GET /api/vendor/profiles/:id
// @access  Private/Vendor
export const getMyProfileById = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const profile = await Profile.findOne({
      _id: req.params.id,
      createdBy: vendorId, // Ensure vendor owns this profile
    })
      .populate('userId', 'email phone')
      .populate('createdBy', 'email phone');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found or you do not have access to it',
      });
    }

    res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update profile created by vendor (with ownership check)
// @route   PUT /api/vendor/profiles/:id
// @access  Private/Vendor
export const updateMyProfile = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const profileData = req.body;

    const profile = await Profile.findOne({
      _id: req.params.id,
      createdBy: vendorId, // Ensure vendor owns this profile
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found or you do not have access to it',
      });
    }

    // Update profile fields
    Object.keys(profileData).forEach((key) => {
      if (profileData[key] !== undefined && 
          key !== 'preferences' && 
          key !== 'verificationStatus' && 
          key !== 'verifiedBy' && 
          key !== 'verifiedAt' && 
          key !== 'rejectionReason' &&
          key !== 'createdBy' &&
          key !== 'isVendorCreated') {
        if (typeof profileData[key] === 'object' && !Array.isArray(profileData[key]) && profileData[key] !== null) {
          profile[key] = { ...profile[key], ...profileData[key] };
        } else {
          profile[key] = profileData[key];
        }
      }
    });

    // Handle preferences separately
    if (profileData.preferences) {
      if (!profile.preferences) {
        profile.preferences = {};
      }
      Object.keys(profileData.preferences).forEach((key) => {
        if (profileData.preferences[key] !== undefined && profileData.preferences[key] !== null) {
          if (key === 'ageRange' || key === 'heightRange') {
            const cleaned = {};
            if (profileData.preferences[key].min !== undefined) cleaned.min = profileData.preferences[key].min;
            if (profileData.preferences[key].max !== undefined) cleaned.max = profileData.preferences[key].max;
            if (Object.keys(cleaned).length > 0) {
              profile.preferences[key] = { ...profile.preferences[key], ...cleaned };
            }
          } else if (Array.isArray(profileData.preferences[key])) {
            profile.preferences[key] = profileData.preferences[key];
          } else {
            profile.preferences[key] = profileData.preferences[key];
          }
        }
      });
    }

    // Set verification status to pending when profile is updated
    if (profile.verificationStatus === 'approved') {
      profile.verificationStatus = 'pending';
      profile.verifiedBy = undefined;
      profile.verifiedAt = undefined;
      profile.rejectionReason = undefined;
    }

    await profile.save();

    res.status(200).json({
      success: true,
      profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete profile created by vendor (with ownership check)
// @route   DELETE /api/vendor/profiles/:id
// @access  Private/Vendor
export const deleteMyProfile = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const profile = await Profile.findOne({
      _id: req.params.id,
      createdBy: vendorId, // Ensure vendor owns this profile
    });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found or you do not have access to it',
      });
    }

    await Profile.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Profile deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get vendor statistics
// @route   GET /api/vendor/stats
// @access  Private/Vendor
export const getMyStats = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const totalProfiles = await Profile.countDocuments({ createdBy: vendorId });
    const activeProfiles = await Profile.countDocuments({ createdBy: vendorId, isActive: true });
    const pendingProfiles = await Profile.countDocuments({ createdBy: vendorId, verificationStatus: 'pending' });
    const approvedProfiles = await Profile.countDocuments({ createdBy: vendorId, verificationStatus: 'approved' });
    const rejectedProfiles = await Profile.countDocuments({ createdBy: vendorId, verificationStatus: 'rejected' });
    const brideProfiles = await Profile.countDocuments({ createdBy: vendorId, type: 'bride' });
    const groomProfiles = await Profile.countDocuments({ createdBy: vendorId, type: 'groom' });

    res.status(200).json({
      success: true,
      stats: {
        totalProfiles,
        activeProfiles,
        pendingProfiles,
        approvedProfiles,
        rejectedProfiles,
        brideProfiles,
        groomProfiles,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

