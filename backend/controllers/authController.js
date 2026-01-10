import crypto from 'crypto';
import User from '../models/User.js';
import Profile from '../models/Profile.js';
import { generateToken } from '../utils/generateToken.js';
import { sendEmail } from '../utils/sendEmail.js';

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
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked. Please contact the admin.',
        accountBlocked: true,
      });
    }

    // Check if user is deactivated
    if (user.isDeactivated === true) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support to reactivate.',
        accountDeactivated: true,
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

// @desc    Forgot password
// @route   POST /api/auth/forgotpassword
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an email address',
      });
    }

    // Get user
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set expire (10 minutes)
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    // Create reset url
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

    // Email message
    const message = `
      You are receiving this email because you (or someone else) has requested the reset of a password.
      
      Please click on the following link to reset your password:
      ${resetUrl}
      
      If you did not request this, please ignore this email and your password will remain unchanged.
      
      This link will expire in 10 minutes.
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Request',
        message,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>You are receiving this email because you (or someone else) has requested the reset of a password.</p>
            <p>Please click on the following button to reset your password:</p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
            <p style="color: #999; font-size: 12px;">This link will expire in 10 minutes.</p>
          </div>
        `,
      });

      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    } catch (error) {
      console.error('Email error:', error);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        success: false,
        message: 'Email could not be sent. Please try again later.',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/resetpassword/:resettoken
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const { resettoken } = req.params;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a password',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    // Get hashed token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(resettoken)
      .digest('hex');

    // Find user with matching token and not expired
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token',
      });
    }

    // Set new password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Deactivate account
// @route   PUT /api/auth/deactivate
// @access  Private
export const deactivateAccount = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.isDeactivated = true;
    user.deactivatedAt = new Date();
    if (reason) {
      user.deactivationReason = reason;
    }
    await user.save();

    // Also deactivate profile
    await Profile.updateOne({ userId: user._id }, { isActive: false });

    res.status(200).json({
      success: true,
      message: 'Account deactivated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Reactivate account
// @route   PUT /api/auth/reactivate
// @access  Private
export const reactivateAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.isDeactivated) {
      return res.status(400).json({
        success: false,
        message: 'Account is not deactivated',
      });
    }

    user.isDeactivated = false;
    user.deactivatedAt = undefined;
    user.deactivationReason = undefined;
    await user.save();

    // Reactivate profile
    await Profile.updateOne({ userId: user._id }, { isActive: true });

    res.status(200).json({
      success: true,
      message: 'Account reactivated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete account (with data export)
// @route   DELETE /api/auth/delete
// @access  Private
export const deleteAccount = async (req, res) => {
  try {
    const { password, exportData } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify password
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to delete account',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password',
      });
    }

    // Export data if requested
    let exportedData = null;
    if (exportData === true || exportData === 'true') {
      const Interest = (await import('../models/Interest.js')).default;
      const Favorite = (await import('../models/Favorite.js')).default;
      const Chat = (await import('../models/Chat.js')).default;
      const Message = (await import('../models/Message.js')).default;
      const Notification = (await import('../models/Notification.js')).default;
      const Subscription = (await import('../models/Subscription.js')).default;

      const profile = await Profile.findOne({ userId: user._id });
      const interests = await Interest.find({
        $or: [{ fromUserId: user._id }, { toUserId: user._id }],
      });
      const favorites = await Favorite.find({ userId: user._id });
      const chats = await Chat.find({ participants: user._id });
      const messages = await Message.find({
        $or: [{ senderId: user._id }, { receiverId: user._id }],
      });
      const notifications = await Notification.find({ userId: user._id });
      const subscriptions = await Subscription.find({ userId: user._id });

      exportedData = {
        user: {
          id: user._id,
          email: user.email,
          phone: user.phone,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        profile: profile ? profile.toObject() : null,
        interests: interests.map(i => i.toObject()),
        favorites: favorites.map(f => f.toObject()),
        chats: chats.map(c => c.toObject()),
        messages: messages.map(m => m.toObject()),
        notifications: notifications.map(n => n.toObject()),
        subscriptions: subscriptions.map(s => s.toObject()),
        exportedAt: new Date().toISOString(),
      };
    }

    // Delete all user data
    await Profile.deleteOne({ userId: user._id });
    await Interest.deleteMany({
      $or: [{ fromUserId: user._id }, { toUserId: user._id }],
    });
    await Favorite.deleteMany({ userId: user._id });
    await Chat.deleteMany({ participants: user._id });
    await Message.deleteMany({
      $or: [{ senderId: user._id }, { receiverId: user._id }],
    });
    await Notification.deleteMany({ userId: user._id });
    await Subscription.deleteMany({ userId: user._id });
    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
      data: exportedData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update email/phone
// @route   PUT /api/auth/update-contact
// @access  Private
export const updateContact = async (req, res) => {
  try {
    const { email, phone, password } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Verify password
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to update contact information',
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password',
      });
    }

    // Check if new email/phone already exists
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email, _id: { $ne: user._id } });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use',
        });
      }
      user.email = email;
    }

    if (phone && phone !== user.phone) {
      const phoneExists = await User.findOne({ phone, _id: { $ne: user._id } });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already in use',
        });
      }
      user.phone = phone;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Contact information updated successfully',
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update privacy settings
// @route   PUT /api/auth/privacy
// @access  Private
export const updatePrivacySettings = async (req, res) => {
  try {
    const { privacySettings } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.privacySettings) {
      user.privacySettings = {
        showEmail: false,
        showPhone: false,
        showProfileInSearch: true,
        allowProfileViews: true,
      };
    }

    if (privacySettings) {
      user.privacySettings = {
        ...user.privacySettings,
        ...privacySettings,
      };
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Privacy settings updated successfully',
      privacySettings: user.privacySettings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Download user data (GDPR)
// @route   GET /api/auth/download-data
// @access  Private
export const downloadUserData = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const Interest = (await import('../models/Interest.js')).default;
    const Favorite = (await import('../models/Favorite.js')).default;
    const Chat = (await import('../models/Chat.js')).default;
    const Message = (await import('../models/Message.js')).default;
    const Notification = (await import('../models/Notification.js')).default;
    const Subscription = (await import('../models/Subscription.js')).default;

    const profile = await Profile.findOne({ userId: user._id });
    const interests = await Interest.find({
      $or: [{ fromUserId: user._id }, { toUserId: user._id }],
    }).populate('fromUserId', 'email phone').populate('toUserId', 'email phone');
    const favorites = await Favorite.find({ userId: user._id }).populate('profileId');
    const chats = await Chat.find({ participants: user._id }).populate('participants', 'email phone');
    const messages = await Message.find({
      $or: [{ senderId: user._id }, { receiverId: user._id }],
    }).populate('senderId', 'email phone').populate('receiverId', 'email phone');
    const notifications = await Notification.find({ userId: user._id });
    const subscriptions = await Subscription.find({ userId: user._id }).populate('planId');

    const userData = {
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileType: user.profileType,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      profile: profile ? profile.toObject() : null,
      interests: interests.map(i => i.toObject()),
      favorites: favorites.map(f => f.toObject()),
      chats: chats.map(c => c.toObject()),
      messages: messages.map(m => m.toObject()),
      notifications: notifications.map(n => n.toObject()),
      subscriptions: subscriptions.map(s => s.toObject()),
      exportedAt: new Date().toISOString(),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=user-data-${user._id}-${Date.now()}.json`);
    res.status(200).json(userData);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

