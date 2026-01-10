import Subscription from '../models/Subscription.js';

// Middleware to check if user has active subscription (including grace period)
export const requireActiveSubscription = async (req, res, next) => {
  try {
    const user = req.user;
    const now = new Date();

    // Check if user has an active subscription
    const subscription = await Subscription.findOne({
      userId: user._id,
      status: 'approved',
    }).populate('planId').sort({ endDate: -1 });

    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: 'Active subscription required. Please subscribe to continue.',
        requiresSubscription: true,
      });
    }

    // Check if subscription is active or in grace period
    const isActive = subscription.endDate >= now;
    const gracePeriodEnd = subscription.gracePeriodEndDate || subscription.endDate;
    const isInGracePeriod = !isActive && gracePeriodEnd >= now;

    if (!isActive && !isInGracePeriod) {
      // Subscription expired and grace period ended
      // Mark subscription as expired
      if (subscription.status === 'approved') {
        subscription.status = 'expired';
        await subscription.save();
        
        // Update user subscription status
        await User.findByIdAndUpdate(user._id, {
          subscriptionStatus: 'expired',
        });
      }

      return res.status(403).json({
        success: false,
        message: 'Your subscription has expired. Please renew to continue.',
        requiresSubscription: true,
        isExpired: true,
      });
    }

    // Attach subscription to request
    req.subscription = subscription;
    req.isInGracePeriod = isInGracePeriod;
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

