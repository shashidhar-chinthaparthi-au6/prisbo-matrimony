import Interest from '../models/Interest.js';
import Notification from '../models/Notification.js';

/**
 * Check and auto-reject expired interests
 * Interests expire after 30 days if not responded to
 */
export const checkAndExpireInterests = async () => {
  try {
    const now = new Date();
    
    // Find all pending interests that have expired
    const expiredInterests = await Interest.find({
      status: 'pending',
      expired: false,
      expiresAt: { $lte: now },
    }).populate('fromUserId', 'email phone').populate('toUserId', 'email phone');

    for (const interest of expiredInterests) {
      // Auto-reject expired interest
      interest.status = 'rejected';
      interest.expired = true;
      interest.expiredAt = now;
      await interest.save();

      // Create notification for sender
      await Notification.create({
        userId: interest.fromUserId._id,
        type: 'interest_rejected',
        title: 'Interest Expired',
        message: `Your interest sent to ${interest.toUserId.email || interest.toUserId.phone} has expired after 30 days without a response.`,
        relatedUserId: interest.toUserId._id,
        relatedInterestId: interest._id,
      });
    }

    console.log(`Auto-rejected ${expiredInterests.length} expired interests`);
    return expiredInterests.length;
  } catch (error) {
    console.error('Error checking interest expiry:', error);
    return 0;
  }
};

