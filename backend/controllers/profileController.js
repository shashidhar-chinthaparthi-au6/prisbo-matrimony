import Profile from '../models/Profile.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');

// @desc    Create or update profile
// @route   POST /api/profiles
// @route   PUT /api/profiles/:id
// @access  Private
export const createOrUpdateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const profileData = req.body;

    // Clean up preferences - remove undefined nested objects
    if (profileData.preferences) {
      if (profileData.preferences.ageRange) {
        if (profileData.preferences.ageRange.min === undefined && profileData.preferences.ageRange.max === undefined) {
          delete profileData.preferences.ageRange;
        } else {
          // Remove undefined values from ageRange
          if (profileData.preferences.ageRange.min === undefined) delete profileData.preferences.ageRange.min;
          if (profileData.preferences.ageRange.max === undefined) delete profileData.preferences.ageRange.max;
        }
      }
      if (profileData.preferences.heightRange) {
        if (profileData.preferences.heightRange.min === undefined && profileData.preferences.heightRange.max === undefined) {
          delete profileData.preferences.heightRange;
        } else {
          // Remove undefined values from heightRange
          if (profileData.preferences.heightRange.min === undefined) delete profileData.preferences.heightRange.min;
          if (profileData.preferences.heightRange.max === undefined) delete profileData.preferences.heightRange.max;
        }
      }
    }

    // Check if profile exists
    let profile = await Profile.findOne({ userId });

    if (profile) {
      // Update existing profile
      Object.keys(profileData).forEach((key) => {
        if (profileData[key] !== undefined && key !== 'preferences') {
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
              // Handle nested objects for ageRange and heightRange
              if (typeof profileData.preferences[key] === 'object' && !Array.isArray(profileData.preferences[key])) {
                const cleaned = {};
                if (profileData.preferences[key].min !== undefined) cleaned.min = profileData.preferences[key].min;
                if (profileData.preferences[key].max !== undefined) cleaned.max = profileData.preferences[key].max;
                if (Object.keys(cleaned).length > 0) {
                  profile.preferences[key] = { ...profile.preferences[key], ...cleaned };
                }
              }
            } else if (Array.isArray(profileData.preferences[key])) {
              profile.preferences[key] = profileData.preferences[key];
            } else {
              profile.preferences[key] = profileData.preferences[key];
            }
          }
        });
      }

      await profile.save();
    } else {
      // Validate required fields for new profile
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

      // Clean preferences - remove empty nested objects
      if (profileData.preferences) {
        const cleanedPreferences = {};
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
        if (Object.keys(cleanedPreferences).length > 0) {
          profileData.preferences = cleanedPreferences;
        } else {
          delete profileData.preferences;
        }
      }

      // Create new profile
      profile = await Profile.create({
        userId,
        ...profileData,
      });
    }

    res.status(200).json({
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

// @desc    Get own profile
// @route   GET /api/profiles/me
// @access  Private
export const getMyProfile = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user.id }).populate('userId', 'email phone');

    res.status(200).json({
      success: true,
      profile: profile || null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get profile by ID
// @route   GET /api/profiles/:id
// @access  Private
export const getProfileById = async (req, res) => {
  try {
    const profile = await Profile.findById(req.params.id)
      .populate('userId', 'email phone')
      .select('-preferences');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    // Increment profile views
    profile.profileViews += 1;
    await profile.save();

    // Get interest status between current user and profile owner
    const Interest = (await import('../models/Interest.js')).default;
    const interest = await Interest.findOne({
      $or: [
        { fromUserId: req.user.id, toUserId: profile.userId._id },
        { fromUserId: profile.userId._id, toUserId: req.user.id },
      ],
    });

    const profileObj = profile.toObject();
    profileObj.interestStatus = interest ? interest.status : null;

    res.status(200).json({
      success: true,
      profile: profileObj,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Upload profile photos
// @route   POST /api/profiles/photos
// @access  Private
export const uploadPhotos = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please upload at least one photo',
      });
    }

    let profile = await Profile.findOne({ userId: req.user.id });

    // If profile doesn't exist, create a basic one first
    if (!profile) {
      // Get user's profileType
      const User = (await import('../models/User.js')).default;
      const user = await User.findById(req.user.id);
      
      profile = await Profile.create({
        userId: req.user.id,
        type: user.profileType || 'bride',
        personalInfo: {
          firstName: '',
          lastName: '',
          dateOfBirth: new Date(),
        },
        location: {
          city: '',
          state: '',
        },
        preferences: {}, // Initialize empty preferences object
      });
    }

    const uploadedPhotos = [];

    for (const file of req.files) {
      try {
        // File is already saved locally by multer
        const relativePath = file.path.replace(uploadsDir, '').replace(/\\/g, '/');
        const url = `/uploads${relativePath}`;
        
        uploadedPhotos.push({
          url,
          isPrimary: profile.photos.length === 0, // First photo is primary
        });
      } catch (uploadError) {
        console.error('Failed to process file:', uploadError);
        return res.status(500).json({
          success: false,
          message: `Failed to upload photo: ${uploadError.message}`,
        });
      }
    }

    profile.photos.push(...uploadedPhotos);
    await profile.save();

    res.status(200).json({
      success: true,
      photos: uploadedPhotos,
      profile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete profile photo
// @route   DELETE /api/profiles/photos/:photoId
// @access  Private
export const deletePhoto = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user.id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    const photo = profile.photos.id(req.params.photoId);

    if (!photo) {
      return res.status(404).json({
        success: false,
        message: 'Photo not found',
      });
    }

    // Delete local file
    try {
      const filePath = path.join(uploadsDir, photo.url.replace('/uploads/', ''));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (deleteError) {
      console.error('Failed to delete file:', deleteError);
      // Continue even if file deletion fails
    }

    // Remove from profile
    profile.photos.pull(req.params.photoId);
    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Photo deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Set primary photo
// @route   PUT /api/profiles/photos/:photoId/primary
// @access  Private
export const setPrimaryPhoto = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user.id });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    // Set all photos to not primary
    profile.photos.forEach((photo) => {
      photo.isPrimary = false;
    });

    // Set selected photo as primary
    const photo = profile.photos.id(req.params.photoId);
    if (photo) {
      photo.isPrimary = true;
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

