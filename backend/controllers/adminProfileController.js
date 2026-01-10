import Profile from '../models/Profile.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');

// @desc    Get pending profiles for verification
// @route   GET /api/admin/profiles/pending
// @access  Private/Admin
export const getPendingProfiles = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Only show user-created profiles (not vendor-created) for verification
    // Vendor-created profiles should be managed separately
    const query = { 
      verificationStatus: 'pending',
      isVendorCreated: false, // Exclude vendor-created profiles
      deletedAt: null, // Exclude deleted profiles
    };
    
    // If vendor is accessing, they shouldn't see verification (they manage their own profiles separately)
    // But if they do access, show nothing (or we could show their own, but they should use vendor dashboard)
    if (req.user.role === 'vendor') {
      // Vendors should not see profile verification - they manage profiles in their own dashboard
      return res.status(200).json({
        success: true,
        profiles: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          pages: 0,
        },
      });
    }

    const profiles = await Profile.find(query)
      .populate('userId', 'email phone isActive')
      .populate('createdBy', 'email phone companyName')
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

// @desc    Get profile by ID for admin review
// @route   GET /api/admin/profiles/:id
// @access  Private/Admin
export const getProfileById = async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id)
      .populate('userId', 'email phone isActive')
      .populate('createdBy', 'email phone companyName')
      .populate('verifiedBy', 'email');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    // Check ownership: vendors can only access their own profiles
    if (req.user.role === 'vendor') {
      if (profile.createdBy?.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this profile',
        });
      }
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

// @desc    Approve profile
// @route   PUT /api/admin/profiles/:id/approve
// @access  Private/Admin
export const approveProfile = async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    // Check ownership: vendors can only approve their own profiles
    if (req.user.role === 'vendor') {
      if (profile.createdBy?.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this profile',
        });
      }
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
        message: `Your profile has been approved and is now visible to other users.`,
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

// @desc    Reject profile
// @route   PUT /api/admin/profiles/:id/reject
// @access  Private/Admin
export const rejectProfile = async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    const profile = await Profile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    // Check ownership: vendors can only reject their own profiles
    if (req.user.role === 'vendor') {
      if (profile.createdBy?.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this profile',
        });
      }
    }

    profile.verificationStatus = 'rejected';
    profile.verifiedBy = req.user._id;
    profile.verifiedAt = new Date();
    profile.rejectionReason = rejectionReason || 'Profile rejected by admin';

    await profile.save();

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

// @desc    Update profile field (admin can edit any field)
// @route   PUT /api/admin/profiles/:id/update
// @access  Private/Admin
export const updateProfileField = async (req, res) => {
  try {
    const { field, value, section } = req.body;

    const profile = await Profile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    // Check ownership: vendors can only update their own profiles
    if (req.user.role === 'vendor') {
      if (profile.createdBy?.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this profile',
        });
      }
    }

    // Update nested field
    if (section) {
      if (!profile[section]) {
        profile[section] = {};
      }
      profile[section][field] = value;
    } else {
      profile[field] = value;
    }

    // Set back to pending if profile was approved (needs re-verification)
    if (profile.verificationStatus === 'approved') {
      profile.verificationStatus = 'pending';
      profile.verifiedBy = undefined;
      profile.verifiedAt = undefined;
      profile.rejectionReason = undefined;
    }

    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Profile field updated successfully',
      profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete profile photo (admin)
// @route   DELETE /api/admin/profiles/:id/photos/:photoId
// @access  Private/Admin
export const deleteProfilePhoto = async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    // Check ownership: vendors can only delete photos from their own profiles
    if (req.user.role === 'vendor') {
      if (profile.createdBy?.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this profile',
        });
      }
    }

    const photoId = req.params.photoId;
    const photo = profile.photos.id(photoId);

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found',
      });
    }

    // Delete file from filesystem
    if (photo.url && photo.url.startsWith('/uploads')) {
      const filePath = path.join(uploadsDir, photo.url.replace('/uploads', ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Remove photo from profile
    profile.photos.pull(photoId);

    // Set back to pending if profile was approved (needs re-verification)
    if (profile.verificationStatus === 'approved') {
      profile.verificationStatus = 'pending';
      profile.verifiedBy = undefined;
      profile.verifiedAt = undefined;
      profile.rejectionReason = undefined;
    }

    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Photo deleted successfully',
      profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get profile verification statistics
// @route   GET /api/admin/profiles/verification-stats
// @access  Private/Admin
export const getVerificationStats = async (req, res) => {
  try {
    // Only count user-created profiles (not vendor-created) for verification stats
    // Vendor-created profiles are managed separately
    const query = { isVendorCreated: false };
    
    // Vendors shouldn't see verification stats - they manage profiles separately
    if (req.user.role === 'vendor') {
      return res.status(200).json({
        success: true,
        stats: {
          pending: 0,
          approved: 0,
          rejected: 0,
          total: 0,
        },
      });
    }
    
    const pending = await Profile.countDocuments({ ...query, verificationStatus: 'pending' });
    const approved = await Profile.countDocuments({ ...query, verificationStatus: 'approved' });
    const rejected = await Profile.countDocuments({ ...query, verificationStatus: 'rejected' });

    res.status(200).json({
      success: true,
      stats: {
        pending,
        approved,
        rejected,
        total: pending + approved + rejected,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Bulk approve profiles
// @route   POST /api/admin/profiles/bulk-approve
// @access  Private/Admin
export const bulkApproveProfiles = async (req, res) => {
  try {
    const { profileIds } = req.body;

    if (!profileIds || !Array.isArray(profileIds) || profileIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of profile IDs',
      });
    }

    const profiles = await Profile.find({ _id: { $in: profileIds } });
    
    if (profiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No profiles found',
      });
    }

    // Update all profiles to approved
    const updateResult = await Profile.updateMany(
      { _id: { $in: profileIds } },
      {
        verificationStatus: 'approved',
        verifiedAt: new Date(),
        verifiedBy: req.user.id,
      }
    );

    // Send notifications to all users
    for (const profile of profiles) {
      await Notification.create({
        userId: profile.userId,
        type: 'profile_approved',
        title: 'Profile Approved',
        message: 'Your profile has been approved and is now visible to others.',
        relatedUserId: req.user.id,
        relatedProfileId: profile._id,
      });
    }

    res.status(200).json({
      success: true,
      message: `${updateResult.modifiedCount} profile(s) approved successfully`,
      count: updateResult.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Bulk reject profiles
// @route   POST /api/admin/profiles/bulk-reject
// @access  Private/Admin
export const bulkRejectProfiles = async (req, res) => {
  try {
    const { profileIds, rejectionReason } = req.body;

    if (!profileIds || !Array.isArray(profileIds) || profileIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of profile IDs',
      });
    }

    const profiles = await Profile.find({ _id: { $in: profileIds } });
    
    if (profiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No profiles found',
      });
    }

    // Update all profiles to rejected
    const updateResult = await Profile.updateMany(
      { _id: { $in: profileIds } },
      {
        verificationStatus: 'rejected',
        rejectionReason: rejectionReason || 'Profile does not meet verification requirements',
        rejectedAt: new Date(),
        rejectedBy: req.user.id,
      }
    );

    // Send notifications to all users
    for (const profile of profiles) {
      await Notification.create({
        userId: profile.userId,
        type: 'profile_rejected',
        title: 'Profile Rejected',
        message: `Your profile has been rejected. Reason: ${rejectionReason || 'Profile does not meet verification requirements'}`,
        relatedUserId: req.user.id,
        relatedProfileId: profile._id,
      });
    }

    res.status(200).json({
      success: true,
      message: `${updateResult.modifiedCount} profile(s) rejected successfully`,
      count: updateResult.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Bulk delete profiles
// @route   DELETE /api/admin/profiles/bulk-delete
// @access  Private/Admin
export const bulkDeleteProfiles = async (req, res) => {
  try {
    const { profileIds } = req.body;

    if (!profileIds || !Array.isArray(profileIds) || profileIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of profile IDs',
      });
    }

    const profiles = await Profile.find({ _id: { $in: profileIds } });
    
    if (profiles.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No profiles found',
      });
    }

    // Soft delete: Set deletedAt instead of hard delete
    const updateResult = await Profile.updateMany(
      { _id: { $in: profileIds } },
      {
        $set: {
          deletedAt: new Date(),
          deletedBy: req.user.id,
          isActive: false, // Also deactivate
        },
      }
    );

    res.status(200).json({
      success: true,
      message: `${updateResult.modifiedCount} profile(s) deleted successfully`,
      count: updateResult.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get deleted profiles
// @route   GET /api/admin/profiles/deleted
// @access  Private/Admin
export const getDeletedProfiles = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, deletedBy } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {
      deletedAt: { $ne: null }, // Only deleted profiles
    };

    if (search) {
      query.$or = [
        { 'personalInfo.firstName': new RegExp(search, 'i') },
        { 'personalInfo.lastName': new RegExp(search, 'i') },
      ];
    }
    
    if (deletedBy) {
      // Search for deletedBy user by email
      const User = (await import('../models/User.js')).default;
      const deletedByUser = await User.findOne({ email: new RegExp(deletedBy, 'i') });
      if (deletedByUser) {
        query.deletedBy = deletedByUser._id;
      } else {
        // If no user found, return empty result
        query.deletedBy = null;
      }
    }

    // Role-based filtering
    if (req.user.role === 'vendor') {
      // Vendors can only see their own deleted profiles
      query.createdBy = req.user.id;
    } else if (req.user.role === 'super_admin') {
      // Super admin can see all deleted profiles (both user-created and vendor-created)
      // No additional filter needed - show all deleted profiles
    } else {
      // For regular admin, only show user-created profiles (not vendor-created)
      const User = (await import('../models/User.js')).default;
      const regularUserIds = await User.find({ role: 'user' }).select('_id');
      const regularUserIdArray = regularUserIds.map(u => u._id);
      query.userId = { $in: regularUserIdArray };
      query.isVendorCreated = false;
    }

    const profiles = await Profile.find(query)
      .populate('userId', 'email phone isActive')
      .populate('createdBy', 'email phone companyName firstName lastName')
      .populate('deletedBy', 'email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ deletedAt: -1 });

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

// @desc    Restore deleted profile
// @route   PUT /api/admin/profiles/:id/restore
// @access  Private/Admin
export const restoreProfile = async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    if (!profile.deletedAt) {
      return res.status(400).json({
        success: false,
        message: 'Profile is not deleted',
      });
    }

    // Restore profile
    profile.deletedAt = null;
    profile.deletedBy = null;
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Profile restored successfully',
      profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Bulk restore profiles
// @route   PUT /api/admin/profiles/bulk-restore
// @access  Private/Admin
export const bulkRestoreProfiles = async (req, res) => {
  try {
    const { profileIds } = req.body;

    if (!profileIds || !Array.isArray(profileIds) || profileIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of profile IDs',
      });
    }

    const updateResult = await Profile.updateMany(
      { _id: { $in: profileIds }, deletedAt: { $ne: null } },
      {
        $unset: {
          deletedAt: '',
          deletedBy: '',
        },
      }
    );

    res.status(200).json({
      success: true,
      message: `${updateResult.modifiedCount} profile(s) restored successfully`,
      count: updateResult.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

