import Subscription from '../models/Subscription.js';

// Middleware to check if user has active subscription
export const requireActiveSubscription = async (req, res, next) => {
  try {
    const user = req.user;

    // Check if user has an active subscription
    const subscription = await Subscription.findOne({
      userId: user._id,
      status: 'approved',
      endDate: { $gte: new Date() },
    }).populate('planId');

    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: 'Active subscription required. Please subscribe to continue.',
        requiresSubscription: true,
      });
    }

    // Attach subscription to request
    req.subscription = subscription;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Helper function to check subscription status (for use in controllers)
export const checkSubscriptionStatus = async (userId) => {
  try {
    const subscription = await Subscription.findOne({
      userId,
      status: 'approved',
      endDate: { $gte: new Date() },
    });

    return {
      hasActiveSubscription: !!subscription,
      subscription,
    };
  } catch (error) {
    return {
      hasActiveSubscription: false,
      subscription: null,
    };
  }
};

