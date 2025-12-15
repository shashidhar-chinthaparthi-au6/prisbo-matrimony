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

    const query = {};
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
    const { page = 1, limit = 20, search, type, isActive } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
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

// @desc    Get statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
export const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProfiles = await Profile.countDocuments();
    const activeProfiles = await Profile.countDocuments({ isActive: true });
    const brideProfiles = await Profile.countDocuments({ type: 'bride', isActive: true });
    const groomProfiles = await Profile.countDocuments({ type: 'groom', isActive: true });
    const totalInterests = await Interest.countDocuments();
    const acceptedInterests = await Interest.countDocuments({ status: 'accepted' });
    const premiumProfiles = await Profile.countDocuments({ isPremium: true });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalProfiles,
        activeProfiles,
        brideProfiles,
        groomProfiles,
        totalInterests,
        acceptedInterests,
        premiumProfiles,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

