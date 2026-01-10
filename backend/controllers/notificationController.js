import Notification from '../models/Notification.js';
import Profile from '../models/Profile.js';

// @desc    Get all notifications
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const { type } = req.query; // Filter by notification type
    
    const query = { userId: req.user.id };
    if (unreadOnly === 'true' || unreadOnly === true) {
      query.isRead = false;
    }
    if (type && type !== 'all') {
      query.type = type;
    }

    const notifications = await Notification.find(query)
      .populate('relatedUserId', 'email phone')
      .populate('relatedProfileId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ userId: req.user.id, isRead: false });

    res.status(200).json({
      success: true,
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    if (notification.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    if (notification.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized',
      });
    }

    await notification.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Delete all notifications
// @route   DELETE /api/notifications/delete-all
// @access  Private
export const deleteAllNotifications = async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.user.id });

    res.status(200).json({
      success: true,
      message: 'All notifications deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get notification preferences
// @route   GET /api/notifications/preferences
// @access  Private
export const getNotificationPreferences = async (req, res) => {
  try {
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.user.id).select('notificationPreferences');
    
    res.status(200).json({
      success: true,
      preferences: user.notificationPreferences || {
        email: {
          interest: true,
          message: true,
          profile: true,
          subscription: true,
          support: true,
        },
        push: {
          interest: true,
          message: true,
          profile: true,
          subscription: true,
          support: true,
        },
        sound: true,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update notification preferences
// @route   PUT /api/notifications/preferences
// @access  Private
export const updateNotificationPreferences = async (req, res) => {
  try {
    const { preferences } = req.body;
    const User = (await import('../models/User.js')).default;
    
    const user = await User.findById(req.user.id);
    if (!user.notificationPreferences) {
      user.notificationPreferences = {
        email: {
          interest: true,
          message: true,
          profile: true,
          subscription: true,
          support: true,
        },
        push: {
          interest: true,
          message: true,
          profile: true,
          subscription: true,
          support: true,
        },
        sound: true,
      };
    }
    
    // Update preferences
    if (preferences.email) {
      user.notificationPreferences.email = {
        ...user.notificationPreferences.email,
        ...preferences.email,
      };
    }
    if (preferences.push) {
      user.notificationPreferences.push = {
        ...user.notificationPreferences.push,
        ...preferences.push,
      };
    }
    if (preferences.sound !== undefined) {
      user.notificationPreferences.sound = preferences.sound;
    }
    
    await user.save();
    
    res.status(200).json({
      success: true,
      preferences: user.notificationPreferences,
      message: 'Notification preferences updated',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

