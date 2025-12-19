import Profile from '../models/Profile.js';
import User from '../models/User.js';
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
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const profiles = await Profile.find({ verificationStatus: 'pending' })
      .populate('userId', 'email phone isActive')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Profile.countDocuments({ verificationStatus: 'pending' });

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
      .populate('verifiedBy', 'email');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
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

    profile.verificationStatus = 'approved';
    profile.verifiedBy = req.user._id;
    profile.verifiedAt = new Date();
    profile.rejectionReason = undefined;

    await profile.save();

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
    const pending = await Profile.countDocuments({ verificationStatus: 'pending' });
    const approved = await Profile.countDocuments({ verificationStatus: 'approved' });
    const rejected = await Profile.countDocuments({ verificationStatus: 'rejected' });

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

