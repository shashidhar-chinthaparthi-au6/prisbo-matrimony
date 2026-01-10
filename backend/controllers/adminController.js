import User from '../models/User.js';
import Profile from '../models/Profile.js';
import Interest from '../models/Interest.js';

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { role: 'user' }; // Only show regular users, not vendors or super_admin
    if (search) {
      query.$or = [
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      users,
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

// @desc    Get all profiles
// @route   GET /api/admin/profiles
// @access  Private/Admin
export const getAllProfiles = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, type, isActive, createdBy, verificationStatus, isVendorCreated } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    
    // If user is vendor (not super_admin), only show their own profiles
    if (req.user.role === 'vendor') {
      query.createdBy = req.user.id;
    }
    
    // If createdBy filter is provided and user is super_admin, apply it
    if (createdBy && req.user.role === 'super_admin') {
      query.createdBy = createdBy;
    }
    
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

    // Handle verificationStatus filter (for verification tab)
    if (verificationStatus !== undefined && verificationStatus !== '') {
      query.verificationStatus = verificationStatus;
    }

    // Handle isVendorCreated filter
    if (isVendorCreated !== undefined) {
      query.isVendorCreated = isVendorCreated === 'true';
    }

    // First, get all user IDs that are regular users (not vendors or super_admin)
    const regularUserIds = await User.find({ role: 'user' }).select('_id');
    const regularUserIdArray = regularUserIds.map(u => u._id);
    
    // Only show profiles where userId is a regular user (not vendor)
    // Also exclude vendor-created profiles when filtering by verification status
    query.userId = { $in: regularUserIdArray };
    if (verificationStatus !== undefined && verificationStatus !== '') {
      query.isVendorCreated = false; // Only show user-created profiles for verification
    }
    
    // Exclude deleted profiles
    query.deletedAt = null;

    const profiles = await Profile.find(query)
      .populate('userId', 'email phone')
      .populate('createdBy', 'email phone companyName firstName lastName')
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

// @desc    Get profile by userId
// @route   GET /api/admin/profiles/user/:userId
// @access  Private/Admin
export const getProfileByUserId = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.params.userId })
      .populate('userId', 'email phone')
      .populate('createdBy', 'email phone companyName');

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found for this user',
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

// @desc    Update profile status
// @route   PUT /api/admin/profiles/:id/status
// @access  Private/Admin
export const updateProfileStatus = async (req, res) => {
  try {
    const { isActive, isFeatured } = req.body;

    const profile = await Profile.findById(req.params.id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found',
      });
    }

    if (isActive !== undefined) {
      profile.isActive = isActive;
    }
    if (isFeatured !== undefined) {
      profile.isFeatured = isFeatured;
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

// @desc    Block/Unblock user
// @route   PUT /api/admin/users/:id/block
// @access  Private/Admin
export const blockUser = async (req, res) => {
  try {
    const { isActive } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.isActive = isActive !== undefined ? isActive : !user.isActive;
    await user.save();

    // Also update profile status
    await Profile.updateOne({ userId: user._id }, { isActive: user.isActive });

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get all vendors
// @route   GET /api/admin/vendors
// @access  Private/SuperAdmin
export const getVendors = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, isActive } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { role: 'vendor' };
    if (search) {
      query.$or = [
        { email: new RegExp(search, 'i') },
        { phone: new RegExp(search, 'i') },
        { companyName: new RegExp(search, 'i') },
        { firstName: new RegExp(search, 'i') },
        { lastName: new RegExp(search, 'i') },
      ];
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const vendors = await User.find(query)
      .select('-password')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      vendors,
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

// @desc    Get statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getStats = async (req, res) => {
  try {
    // Base query - if vendor, only their profiles; if super_admin, all
    const profileQuery = req.user.role === 'vendor' 
      ? { createdBy: req.user.id } 
      : {};
    
    // Count only regular users (excluding super_admin and vendors)
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalVendors = await User.countDocuments({ role: 'vendor' });
    const totalProfiles = await Profile.countDocuments(profileQuery);
    const activeProfiles = await Profile.countDocuments({ ...profileQuery, isActive: true });
    const brideProfiles = await Profile.countDocuments({ ...profileQuery, type: 'bride', isActive: true });
    const groomProfiles = await Profile.countDocuments({ ...profileQuery, type: 'groom', isActive: true });
    const totalInterests = await Interest.countDocuments();
    const acceptedInterests = await Interest.countDocuments({ status: 'accepted' });
    const premiumProfiles = await Profile.countDocuments({ ...profileQuery, isPremium: true });
    const vendorCreatedProfiles = await Profile.countDocuments({ isVendorCreated: true, ...profileQuery });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalVendors,
        totalProfiles,
        activeProfiles,
        brideProfiles,
        groomProfiles,
        totalInterests,
        acceptedInterests,
        premiumProfiles,
        vendorCreatedProfiles,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Create vendor
// @route   POST /api/admin/vendors
// @access  Private/SuperAdmin
export const createVendor = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      companyName,
      vendorContactInfo,
      vendorAddress,
      vendorLocation,
      vendorBusinessDetails,
    } = req.body;

    // Validation
    if (!email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, phone, and password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or phone already exists',
      });
    }

    // Handle file uploads for proofs
    const { uploadToS3 } = await import('../config/s3.js');
    const vendorProofs = {};

    // Upload business registration document if provided
    if (req.files?.businessRegistration && req.files.businessRegistration.length > 0) {
      try {
        vendorProofs.businessRegistration = await uploadToS3(req.files.businessRegistration[0], 'vendor-proofs');
      } catch (error) {
        console.error('Error uploading business registration:', error);
      }
    }

    // Upload GST certificate if provided
    if (req.files?.gstCertificate && req.files.gstCertificate.length > 0) {
      try {
        vendorProofs.gstCertificate = await uploadToS3(req.files.gstCertificate[0], 'vendor-proofs');
      } catch (error) {
        console.error('Error uploading GST certificate:', error);
      }
    }

    // Upload PAN card if provided
    if (req.files?.panCard && req.files.panCard.length > 0) {
      try {
        vendorProofs.panCard = await uploadToS3(req.files.panCard[0], 'vendor-proofs');
      } catch (error) {
        console.error('Error uploading PAN card:', error);
      }
    }

    // Upload Aadhar card if provided
    if (req.files?.aadharCard && req.files.aadharCard.length > 0) {
      try {
        vendorProofs.aadharCard = await uploadToS3(req.files.aadharCard[0], 'vendor-proofs');
      } catch (error) {
        console.error('Error uploading Aadhar card:', error);
      }
    }

    // Upload other documents if provided
    if (req.files?.otherDocuments && req.files.otherDocuments.length > 0) {
      vendorProofs.otherDocuments = [];
      for (const file of req.files.otherDocuments) {
        try {
          const url = await uploadToS3(file, 'vendor-proofs');
          vendorProofs.otherDocuments.push(url);
        } catch (error) {
          console.error('Error uploading other document:', error);
        }
      }
    }

    // Parse JSON fields if they are strings
    let parsedAddress = {};
    let parsedLocation = {};
    let parsedBusinessDetails = {};

    try {
      parsedAddress = typeof vendorAddress === 'string' ? JSON.parse(vendorAddress) : (vendorAddress || {});
    } catch (e) {
      parsedAddress = {};
    }

    try {
      parsedLocation = typeof vendorLocation === 'string' ? JSON.parse(vendorLocation) : (vendorLocation || {});
    } catch (e) {
      parsedLocation = {};
    }

    try {
      parsedBusinessDetails = typeof vendorBusinessDetails === 'string' ? JSON.parse(vendorBusinessDetails) : (vendorBusinessDetails || {});
    } catch (e) {
      parsedBusinessDetails = {};
    }

    // Create vendor
    const vendor = await User.create({
      firstName: firstName || '',
      lastName: lastName || '',
      email,
      phone,
      password,
      role: 'vendor',
      companyName: companyName || '',
      vendorContactInfo: vendorContactInfo || '',
      vendorAddress: parsedAddress,
      vendorLocation: parsedLocation,
      vendorBusinessDetails: parsedBusinessDetails,
      vendorProofs: Object.keys(vendorProofs).length > 0 ? vendorProofs : undefined,
      isActive: true,
    });

    // Remove password from response
    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

    // Send notification to vendor
    const Notification = (await import('../models/Notification.js')).default;
    await Notification.create({
      userId: vendor._id,
      type: 'vendor_created',
      title: 'Vendor Account Created',
      message: `Your vendor account has been created. You can now login and start managing profiles.`,
      relatedUserId: req.user.id,
    });

    res.status(201).json({
      success: true,
      vendor: vendorResponse,
      message: 'Vendor created successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Bulk block users
// @route   PUT /api/admin/users/bulk-block
// @access  Private/Admin
export const bulkBlockUsers = async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of user IDs',
      });
    }

    // Prevent blocking super_admin or vendors
    const users = await User.find({ _id: { $in: userIds } });
    const validUserIds = users
      .filter((user) => user.role === 'user')
      .map((user) => user._id);

    if (validUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid users found to block',
      });
    }

    // Update all users to blocked
    const updateResult = await User.updateMany(
      { _id: { $in: validUserIds } },
      {
        isBlocked: true,
        blockedAt: new Date(),
        blockedBy: req.user.id,
      }
    );

    // Send notifications to all blocked users
    const Notification = (await import('../models/Notification.js')).default;
    for (const userId of validUserIds) {
      await Notification.create({
        userId,
        type: 'account_blocked',
        title: 'Account Blocked',
        message: 'Your account has been blocked by an administrator.',
        relatedUserId: req.user.id,
      });
    }

    res.status(200).json({
      success: true,
      message: `${updateResult.modifiedCount} user(s) blocked successfully`,
      count: updateResult.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update vendor
// @route   PUT /api/admin/vendors/:id
// @access  Private/SuperAdmin
export const updateVendor = async (req, res) => {
  try {
    const vendorId = req.params.id;
    const {
      firstName,
      lastName,
      email,
      phone,
      companyName,
      vendorContactInfo,
      vendorAddress,
      vendorLocation,
      vendorBusinessDetails,
    } = req.body;

    const vendor = await User.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    if (vendor.role !== 'vendor') {
      return res.status(400).json({
        success: false,
        message: 'User is not a vendor',
      });
    }

    // Handle file uploads for proofs
    const { uploadToS3 } = await import('../config/s3.js');
    const vendorProofs = { ...(vendor.vendorProofs || {}) };

    // Upload business registration document if provided
    if (req.files?.businessRegistration && req.files.businessRegistration.length > 0) {
      try {
        vendorProofs.businessRegistration = await uploadToS3(req.files.businessRegistration[0], 'vendor-proofs');
      } catch (error) {
        console.error('Error uploading business registration:', error);
      }
    }

    // Upload GST certificate if provided
    if (req.files?.gstCertificate && req.files.gstCertificate.length > 0) {
      try {
        vendorProofs.gstCertificate = await uploadToS3(req.files.gstCertificate[0], 'vendor-proofs');
      } catch (error) {
        console.error('Error uploading GST certificate:', error);
      }
    }

    // Upload PAN card if provided
    if (req.files?.panCard && req.files.panCard.length > 0) {
      try {
        vendorProofs.panCard = await uploadToS3(req.files.panCard[0], 'vendor-proofs');
      } catch (error) {
        console.error('Error uploading PAN card:', error);
      }
    }

    // Upload Aadhar card if provided
    if (req.files?.aadharCard && req.files.aadharCard.length > 0) {
      try {
        vendorProofs.aadharCard = await uploadToS3(req.files.aadharCard[0], 'vendor-proofs');
      } catch (error) {
        console.error('Error uploading Aadhar card:', error);
      }
    }

    // Upload other documents if provided
    if (req.files?.otherDocuments && req.files.otherDocuments.length > 0) {
      if (!vendorProofs.otherDocuments) {
        vendorProofs.otherDocuments = [];
      }
      for (const file of req.files.otherDocuments) {
        try {
          const url = await uploadToS3(file, 'vendor-proofs');
          vendorProofs.otherDocuments.push(url);
        } catch (error) {
          console.error('Error uploading other document:', error);
        }
      }
    }

    // Parse JSON fields if they are strings
    let parsedAddress = vendor.vendorAddress || {};
    let parsedLocation = vendor.vendorLocation || {};
    let parsedBusinessDetails = vendor.vendorBusinessDetails || {};

    if (vendorAddress) {
      try {
        parsedAddress = typeof vendorAddress === 'string' ? JSON.parse(vendorAddress) : (vendorAddress || {});
      } catch (e) {
        parsedAddress = vendor.vendorAddress || {};
      }
    }

    if (vendorLocation) {
      try {
        parsedLocation = typeof vendorLocation === 'string' ? JSON.parse(vendorLocation) : (vendorLocation || {});
      } catch (e) {
        parsedLocation = vendor.vendorLocation || {};
      }
    }

    if (vendorBusinessDetails) {
      try {
        parsedBusinessDetails = typeof vendorBusinessDetails === 'string' ? JSON.parse(vendorBusinessDetails) : (vendorBusinessDetails || {});
      } catch (e) {
        parsedBusinessDetails = vendor.vendorBusinessDetails || {};
      }
    }

    // Update allowed fields
    if (firstName !== undefined) vendor.firstName = firstName;
    if (lastName !== undefined) vendor.lastName = lastName;
    if (email !== undefined) vendor.email = email;
    if (phone !== undefined) vendor.phone = phone;
    if (companyName !== undefined) vendor.companyName = companyName;
    if (vendorContactInfo !== undefined) vendor.vendorContactInfo = vendorContactInfo;
    if (vendorAddress) vendor.vendorAddress = { ...vendor.vendorAddress, ...parsedAddress };
    if (vendorLocation) vendor.vendorLocation = { ...vendor.vendorLocation, ...parsedLocation };
    if (vendorBusinessDetails) vendor.vendorBusinessDetails = { ...vendor.vendorBusinessDetails, ...parsedBusinessDetails };
    
    // Update vendor proofs if any files were uploaded
    if (Object.keys(vendorProofs).length > 0 && (req.files?.businessRegistration || req.files?.gstCertificate || req.files?.panCard || req.files?.aadharCard || req.files?.otherDocuments)) {
      vendor.vendorProofs = vendorProofs;
    }

    await vendor.save();

    // Remove password from response
    const vendorResponse = vendor.toObject();
    delete vendorResponse.password;

    res.status(200).json({
      success: true,
      message: 'Vendor updated successfully',
      vendor: vendorResponse,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Bulk delete users
// @route   DELETE /api/admin/users/bulk-delete
// @access  Private/Admin
export const bulkDeleteUsers = async (req, res) => {
  try {
    const { userIds } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of user IDs',
      });
    }

    // Prevent deleting super_admin
    const users = await User.find({ _id: { $in: userIds } });
    const validUserIds = users
      .filter((user) => user.role !== 'super_admin')
      .map((user) => user._id);

    if (validUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid users found to delete',
      });
    }

    // Delete associated profiles and their photos
    const Profile = (await import('../models/Profile.js')).default;
    const profiles = await Profile.find({ userId: { $in: validUserIds } });
    
    // Delete profile photos
    const path = (await import('path')).default;
    const fs = (await import('fs')).default;
    const { fileURLToPath } = await import('url');
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const uploadsDir = path.join(__dirname, '../uploads');

    for (const profile of profiles) {
      if (profile.photos && profile.photos.length > 0) {
        for (const photo of profile.photos) {
          if (photo.url) {
            const photoPath = path.join(uploadsDir, photo.url.replace('/uploads/', ''));
            try {
              if (fs.existsSync(photoPath)) {
                fs.unlinkSync(photoPath);
              }
            } catch (err) {
              console.error(`Error deleting photo ${photoPath}:`, err);
            }
          }
        }
      }
    }

    // Delete profiles
    await Profile.deleteMany({ userId: { $in: validUserIds } });

    // Delete users
    const deleteResult = await User.deleteMany({ _id: { $in: validUserIds } });

    res.status(200).json({
      success: true,
      message: `${deleteResult.deletedCount} user(s) deleted successfully`,
      count: deleteResult.deletedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

