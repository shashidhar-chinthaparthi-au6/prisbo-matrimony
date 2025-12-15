import User from '../models/User.js';
import Profile from '../models/Profile.js';
import { generateToken } from '../utils/generateToken.js';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { email, phone, password, type } = req.body;

    // Validation
    if (!email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email, phone, and password',
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ $or: [{ email }, { phone }] });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or phone',
      });
    }

    // Create user
    const user = await User.create({
      email,
      phone,
      password,
      profileType: type, // Store type selected during registration
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileType: user.profileType,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    // Validation
    if (!password || (!email && !phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email or phone and password',
      });
    }

    // Check for user
    const user = await User.findOne(email ? { email } : { phone }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated',
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    const token = generateToken(user._id);

    // Update last active
    const profile = await Profile.findOne({ userId: user._id });
    if (profile) {
      profile.lastActive = new Date();
      await profile.save();
    }

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const profile = await Profile.findOne({ userId: req.user.id });

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileType: user.profileType,
        profile: profile || null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

