import Subscription from '../models/Subscription.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';

// Check and send expiry warnings
export const checkAndSendExpiryWarnings = async () => {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

    // Find subscriptions expiring in 7 days (first warning)
    const subscriptionsExpiringIn7Days = await Subscription.find({
      status: 'approved',
      endDate: {
        $gte: sevenDaysFromNow,
        $lt: new Date(sevenDaysFromNow.getTime() + 24 * 60 * 60 * 1000), // Within 24 hours of 7 days
      },
      expiryWarningSent: false,
    }).populate('userId', 'email');

    // Find subscriptions expiring in 3 days (second warning)
    const subscriptionsExpiringIn3Days = await Subscription.find({
      status: 'approved',
      endDate: {
        $gte: threeDaysFromNow,
        $lt: new Date(threeDaysFromNow.getTime() + 24 * 60 * 60 * 1000),
      },
      expiryWarningSent: true, // Already sent first warning
    }).populate('userId', 'email');

    // Find subscriptions expiring in 1 day (final warning)
    const subscriptionsExpiringIn1Day = await Subscription.find({
      status: 'approved',
      endDate: {
        $gte: oneDayFromNow,
        $lt: new Date(oneDayFromNow.getTime() + 24 * 60 * 60 * 1000),
      },
      expiryWarningSent: true,
    }).populate('userId', 'email');

    // Send notifications
    for (const subscription of subscriptionsExpiringIn7Days) {
      const daysLeft = Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24));
      await Notification.create({
        userId: subscription.userId._id,
        type: 'subscription_expiring',
        title: 'Subscription Expiring Soon',
        message: `Your subscription will expire in ${daysLeft} days. Please renew to continue using all features.`,
        relatedSubscriptionId: subscription._id,
      });

      subscription.expiryWarningSent = true;
      subscription.expiryWarningSentAt = now;
      await subscription.save();
    }

    for (const subscription of subscriptionsExpiringIn3Days) {
      const daysLeft = Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24));
      await Notification.create({
        userId: subscription.userId._id,
        type: 'subscription_expiring',
        title: 'Subscription Expiring Soon',
        message: `Your subscription will expire in ${daysLeft} days. Please renew soon.`,
        relatedSubscriptionId: subscription._id,
      });
    }

    for (const subscription of subscriptionsExpiringIn1Day) {
      const daysLeft = Math.ceil((subscription.endDate - now) / (1000 * 60 * 60 * 24));
      await Notification.create({
        userId: subscription.userId._id,
        type: 'subscription_expiring',
        title: 'Subscription Expiring Tomorrow',
        message: `Your subscription expires tomorrow! Please renew immediately to avoid service interruption.`,
        relatedSubscriptionId: subscription._id,
      });
    }

    // Mark expired subscriptions
    const expiredSubscriptions = await Subscription.find({
      status: 'approved',
      endDate: { $lt: now },
    });

    for (const subscription of expiredSubscriptions) {
      // Check if grace period has ended
      const gracePeriodEnd = subscription.gracePeriodEndDate || subscription.endDate;
      if (gracePeriodEnd < now) {
        subscription.status = 'expired';
        await subscription.save();

        // Update user subscription status
        await User.findByIdAndUpdate(subscription.userId, {
          subscriptionStatus: 'expired',
        });

        // Send expiry notification
        await Notification.create({
          userId: subscription.userId,
          type: 'subscription_expired',
          title: 'Subscription Expired',
          message: 'Your subscription has expired. Please renew to continue using all features.',
          relatedSubscriptionId: subscription._id,
        });
      }
    }

    console.log(`Expiry check completed. Processed ${subscriptionsExpiringIn7Days.length + subscriptionsExpiringIn3Days.length + subscriptionsExpiringIn1Day.length} warnings and ${expiredSubscriptions.length} expired subscriptions.`);
  } catch (error) {
    console.error('Error checking subscription expiry:', error);
  }
};

// Auto-renew subscriptions (if enabled)
export const processAutoRenewals = async () => {
  try {
    const now = new Date();
    const oneDayFromNow = new Date(now);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

    // Find subscriptions expiring in 1 day with auto-renew enabled
    const subscriptionsToRenew = await Subscription.find({
      status: 'approved',
      endDate: {
        $gte: now,
        $lte: oneDayFromNow,
      },
      autoRenew: true,
    }).populate('planId').populate('userId');

    for (const subscription of subscriptionsToRenew) {
      // Create new subscription request for auto-renewal
      // Note: This creates a pending subscription that admin needs to approve
      const newSubscription = await Subscription.create({
        userId: subscription.userId._id,
        planId: subscription.planId._id,
        planName: subscription.planName,
        planDuration: subscription.planDuration,
        amount: subscription.amount,
        paymentMethod: subscription.paymentMethod,
        status: 'pending',
        autoRenew: true, // Keep auto-renew enabled
      });

      // Send notification to user
      await Notification.create({
        userId: subscription.userId._id,
        type: 'subscription_auto_renew',
        title: 'Auto-Renewal Initiated',
        message: `Your subscription has been automatically renewed. Please complete payment for approval.`,
        relatedSubscriptionId: newSubscription._id,
      });
    }

    console.log(`Auto-renewal check completed. Processed ${subscriptionsToRenew.length} subscriptions.`);
  } catch (error) {
    console.error('Error processing auto-renewals:', error);
  }
};

