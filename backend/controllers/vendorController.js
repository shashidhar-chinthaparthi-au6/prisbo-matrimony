import Profile from '../models/Profile.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import Subscription from '../models/Subscription.js';
import Invoice from '../models/Invoice.js';
import { generateInvoiceNumber } from '../utils/generateInvoiceNumber.js';

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

// @desc    Approve profile (vendor can approve their own profiles)
// @route   PUT /api/vendor/profiles/:id/approve
// @access  Private/Vendor
export const approveProfile = async (req, res) => {
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

    profile.verificationStatus = 'approved';
    profile.verifiedBy = req.user._id;
    profile.verifiedAt = new Date();
    profile.rejectionReason = undefined;

    await profile.save();

    // Send notification to user
    if (profile.userId) {
      await Notification.create({
        userId: profile.userId,
        type: 'profile_approved',
        title: 'Profile Approved',
        message: `Your profile has been approved by ${req.user.companyName || 'your vendor'} and is now visible to other users.`,
        relatedProfileId: profile._id,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile approved successfully',
      profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Reject profile (vendor can reject their own profiles)
// @route   PUT /api/vendor/profiles/:id/reject
// @access  Private/Vendor
export const rejectProfile = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { rejectionReason } = req.body;

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

    profile.verificationStatus = 'rejected';
    profile.verifiedBy = req.user._id;
    profile.verifiedAt = new Date();
    profile.rejectionReason = rejectionReason || 'Profile rejected by vendor';

    await profile.save();

    // Send notification to user
    if (profile.userId) {
      await Notification.create({
        userId: profile.userId,
        type: 'profile_rejected',
        title: 'Profile Rejected',
        message: `Your profile has been rejected. Reason: ${profile.rejectionReason}`,
        relatedProfileId: profile._id,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile rejected successfully',
      profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Activate/Deactivate profile (vendor can manage their own profiles)
// @route   PUT /api/vendor/profiles/:id/status
// @access  Private/Vendor
export const updateProfileStatus = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { isActive } = req.body;

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

    profile.isActive = isActive !== undefined ? isActive : !profile.isActive;
    await profile.save();

    res.status(200).json({
      success: true,
      message: `Profile ${profile.isActive ? 'activated' : 'deactivated'} successfully`,
      profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get subscriptions for vendor's members
// @route   GET /api/vendor/subscriptions
// @access  Private/Vendor
export const getMySubscriptions = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { page = 1, limit = 20, search, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get all user IDs whose profiles were created by this vendor
    const profiles = await Profile.find({ createdBy: vendorId }).select('userId');
    const userIds = profiles.map(p => p.userId).filter(Boolean);

    if (userIds.length === 0) {
      return res.status(200).json({
        success: true,
        subscriptions: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0,
        },
      });
    }

    const query = { userId: { $in: userIds } };
    
    if (status) {
      query.status = status;
    }
    
    if (search) {
      // Search by user email or phone
      const users = await User.find({
        _id: { $in: userIds },
        $or: [
          { email: new RegExp(search, 'i') },
          { phone: new RegExp(search, 'i') },
        ],
      }).select('_id');
      const searchUserIds = users.map(u => u._id);
      query.userId = { $in: searchUserIds };
    }

    const subscriptions = await Subscription.find(query)
      .populate('userId', 'email phone')
      .populate('planId')
      .populate('approvedBy', 'email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Subscription.countDocuments(query);

    res.status(200).json({
      success: true,
      subscriptions,
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

// @desc    Approve subscription (vendor can approve subscriptions for their members)
// @route   PUT /api/vendor/subscriptions/:id/approve
// @access  Private/Vendor
export const approveSubscription = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { cashReceivedDate, cashReceivedBy } = req.body;

    const subscription = await Subscription.findById(req.params.id)
      .populate('userId', 'email phone');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    // Check if the subscription belongs to a user whose profile was created by this vendor
    const profile = await Profile.findOne({
      userId: subscription.userId._id,
      createdBy: vendorId,
    });

    if (!profile) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to approve this subscription',
      });
    }

    if (subscription.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Subscription is already ${subscription.status}`,
      });
    }

    // Check if this is an upgrade
    const existingActiveSubscription = await Subscription.findOne({
      userId: subscription.userId._id,
      status: 'approved',
      endDate: { $gte: new Date() },
      _id: { $ne: subscription._id },
    }).sort({ endDate: -1 });

    // Update subscription
    subscription.status = 'approved';
    subscription.approvedBy = req.user._id;
    subscription.approvedAt = new Date();
    
    if (existingActiveSubscription) {
      subscription.startDate = existingActiveSubscription.endDate;
      const endDate = new Date(existingActiveSubscription.endDate);
      endDate.setDate(endDate.getDate() + subscription.planDuration);
      subscription.endDate = endDate;
    } else {
      subscription.startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + subscription.planDuration);
      subscription.endDate = endDate;
    }

    // Update cash payment details if applicable
    if (subscription.paymentMethod === 'cash' || subscription.paymentMethod === 'mixed') {
      if (cashReceivedDate) {
        subscription.cashReceivedDate = new Date(cashReceivedDate);
      }
      if (cashReceivedBy) {
        subscription.cashReceivedBy = cashReceivedBy;
      }
    }

    await subscription.save();

    // Generate invoice
    let invoice = null;
    try {
      const invoiceNumber = await generateInvoiceNumber();
      
      invoice = await Invoice.create({
        invoiceNumber,
        subscriptionId: subscription._id,
        userId: subscription.userId._id,
        planName: subscription.planName,
        planDuration: subscription.planDuration,
        amount: subscription.amount,
        paymentMethod: subscription.paymentMethod,
        upiAmount: subscription.upiAmount,
        cashAmount: subscription.cashAmount,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        status: 'paid',
      });

      subscription.invoiceId = invoice._id;
      await subscription.save();
    } catch (error) {
      console.error('Error creating invoice:', error);
      return res.status(500).json({
        success: false,
        message: 'Subscription approved but failed to generate invoice. Please try again or contact support.',
        error: error.message,
      });
    }

    // Set grace period
    const gracePeriodEndDate = new Date(subscription.endDate);
    gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + (subscription.gracePeriodDays || 7));
    subscription.gracePeriodEndDate = gracePeriodEndDate;

    await subscription.save();

    // Update user subscription status
    await User.findByIdAndUpdate(subscription.userId._id, {
      subscriptionId: subscription._id,
      subscriptionStatus: 'active',
      subscriptionExpiryDate: subscription.endDate,
    });

    // Send notification to user
    await Notification.create({
      userId: subscription.userId._id,
      type: 'subscription_approved',
      title: 'Subscription Approved',
      message: `Your subscription for ${subscription.planName} has been approved by ${req.user.companyName || 'your vendor'} and is now active.`,
      relatedUserId: req.user.id,
    });

    res.status(200).json({
      success: true,
      subscription,
      invoice,
      message: 'Subscription approved successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Reject subscription (vendor can reject subscriptions for their members)
// @route   PUT /api/vendor/subscriptions/:id/reject
// @access  Private/Vendor
export const rejectSubscription = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { rejectionReason } = req.body;

    const subscription = await Subscription.findById(req.params.id)
      .populate('userId', 'email phone');

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    // Check if the subscription belongs to a user whose profile was created by this vendor
    const profile = await Profile.findOne({
      userId: subscription.userId._id,
      createdBy: vendorId,
    });

    if (!profile) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to reject this subscription',
      });
    }

    if (subscription.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Subscription is already ${subscription.status}`,
      });
    }

    subscription.status = 'rejected';
    subscription.rejectedBy = req.user._id;
    subscription.rejectedAt = new Date();
    subscription.rejectionReason = rejectionReason || 'Subscription rejected by vendor';

    await subscription.save();

    // Send notification to user
    await Notification.create({
      userId: subscription.userId._id,
      type: 'subscription_rejected',
      title: 'Subscription Rejected',
      message: `Your subscription has been rejected. Reason: ${subscription.rejectionReason}`,
      relatedUserId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: 'Subscription rejected successfully',
      subscription,
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

    // Get subscription stats
    const profiles = await Profile.find({ createdBy: vendorId }).select('userId');
    const userIds = profiles.map(p => p.userId).filter(Boolean);
    const pendingSubscriptions = userIds.length > 0 
      ? await Subscription.countDocuments({ userId: { $in: userIds }, status: 'pending' })
      : 0;
    const approvedSubscriptions = userIds.length > 0
      ? await Subscription.countDocuments({ userId: { $in: userIds }, status: 'approved' })
      : 0;

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
        pendingSubscriptions,
        approvedSubscriptions,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

