import Interest from '../models/Interest.js';
import Profile from '../models/Profile.js';
import Chat from '../models/Chat.js';
import Notification from '../models/Notification.js';

// @desc    Send interest
// @route   POST /api/interests
// @access  Private
export const sendInterest = async (req, res) => {
  try {
    const { toUserId, message } = req.body;
    const fromUserId = req.user.id;

    if (!toUserId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide toUserId',
      });
    }

    // Prevent self-interest
    if (fromUserId === toUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send interest to yourself',
      });
    }

    // Check if target user exists and is active
    const User = (await import('../models/User.js')).default;
    const targetUser = await User.findById(toUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    if (!targetUser.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send interest to an inactive user',
      });
    }

    // Check if target user has blocked the sender
    if (targetUser.blockedUsers?.includes(fromUserId)) {
      return res.status(403).json({
        success: false,
        message: 'You have been blocked by this user',
      });
    }

    // Check if sender has blocked the target user
    const senderUser = await User.findById(fromUserId);
    if (senderUser?.blockedUsers?.includes(toUserId)) {
      return res.status(403).json({
        success: false,
        message: 'You have blocked this user',
      });
    }

    // Check if target profile exists and is verified
    const targetProfile = await Profile.findOne({ userId: toUserId });
    if (!targetProfile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found for this user',
      });
    }
    if (targetProfile.verificationStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot send interest to an unverified profile',
      });
    }

    // Check if interest already exists (including pending, accepted, or rejected)
    const existingInterest = await Interest.findOne({
      $or: [
        { fromUserId, toUserId },
        { fromUserId: toUserId, toUserId: fromUserId },
      ],
    });

    if (existingInterest) {
      if (existingInterest.status === 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Interest already sent and pending',
          interest: existingInterest,
        });
      }
      if (existingInterest.status === 'accepted') {
        return res.status(400).json({
          success: false,
          message: 'Interest already accepted. You can start chatting!',
          interest: existingInterest,
        });
      }
      if (existingInterest.status === 'rejected') {
        return res.status(400).json({
          success: false,
          message: 'Interest was previously rejected',
          interest: existingInterest,
        });
      }
    }

    // Create interest
    const interest = await Interest.create({
      fromUserId,
      toUserId,
      message,
    });

    // Get sender profile for notification
    const senderProfile = await Profile.findOne({ userId: fromUserId });

    // Create notification for receiver
    await Notification.create({
      userId: toUserId,
      type: 'interest_sent',
      title: 'New Interest Received',
      message: `${senderProfile?.personalInfo?.firstName || 'Someone'} sent you an interest`,
      relatedUserId: fromUserId,
      relatedProfileId: senderProfile?._id,
      relatedInterestId: interest._id,
    });

    const populatedInterest = await Interest.findById(interest._id)
      .populate('fromUserId', 'email phone')
      .populate('toUserId', 'email phone');

    res.status(201).json({
      success: true,
      interest: populatedInterest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Accept interest
// @route   PUT /api/interests/:id/accept
// @access  Private
export const acceptInterest = async (req, res) => {
  try {
    const interest = await Interest.findById(req.params.id);

    if (!interest) {
      return res.status(404).json({
        success: false,
        message: 'Interest not found',
      });
    }

    // Check if user is the receiver
    if (interest.toUserId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to accept this interest',
      });
    }

    interest.status = 'accepted';
    await interest.save();

    // Get receiver profile for notification
    const receiverProfile = await Profile.findOne({ userId: interest.toUserId });

    // Create notification for sender
    await Notification.create({
      userId: interest.fromUserId,
      type: 'interest_accepted',
      title: 'Interest Accepted',
      message: `${receiverProfile?.personalInfo?.firstName || 'Someone'} accepted your interest`,
      relatedUserId: interest.toUserId,
      relatedProfileId: receiverProfile?._id,
      relatedInterestId: interest._id,
    });

    // Create chat room
    const chat = await Chat.findOne({
      participants: { $all: [interest.fromUserId, interest.toUserId] },
    });

    if (!chat) {
      await Chat.create({
        participants: [interest.fromUserId, interest.toUserId],
      });
    }

    const populatedInterest = await Interest.findById(interest._id)
      .populate('fromUserId', 'email phone')
      .populate('toUserId', 'email phone');

    res.status(200).json({
      success: true,
      interest: populatedInterest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Reject interest
// @route   PUT /api/interests/:id/reject
// @access  Private
export const rejectInterest = async (req, res) => {
  try {
    const interest = await Interest.findById(req.params.id);

    if (!interest) {
      return res.status(404).json({
        success: false,
        message: 'Interest not found',
      });
    }

    // Check if user is the receiver
    if (interest.toUserId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject this interest',
      });
    }

    interest.status = 'rejected';
    await interest.save();

    // Get receiver profile for notification
    const receiverProfile = await Profile.findOne({ userId: interest.toUserId });

    // Create notification for sender
    await Notification.create({
      userId: interest.fromUserId,
      type: 'interest_rejected',
      title: 'Interest Rejected',
      message: `${receiverProfile?.personalInfo?.firstName || 'Someone'} rejected your interest`,
      relatedUserId: interest.toUserId,
      relatedProfileId: receiverProfile?._id,
      relatedInterestId: interest._id,
    });

    res.status(200).json({
      success: true,
      interest,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get sent interests
// @route   GET /api/interests/sent
// @access  Private
export const getSentInterests = async (req, res) => {
  try {
    const interests = await Interest.find({ fromUserId: req.user.id })
      .populate('toUserId', 'email phone')
      .sort({ createdAt: -1 });

    // Get profiles for each interest
    const interestsWithProfiles = await Promise.all(
      interests.map(async (interest) => {
        const profile = await Profile.findOne({ userId: interest.toUserId._id });
        const myProfile = await Profile.findOne({ userId: req.user.id });
        
        // Calculate compatibility score
        const { calculateCompatibility, getMutualInterests } = await import('../utils/compatibilityCalculator.js');
        const compatibility = myProfile && profile ? await calculateCompatibility(myProfile._id, profile._id) : 0;
        const mutual = myProfile && profile ? getMutualInterests(myProfile, profile) : [];
        
        // Check if expired
        const isExpired = interest.expiresAt && new Date(interest.expiresAt) <= new Date() && interest.status === 'pending';
        const daysUntilExpiry = interest.expiresAt && interest.status === 'pending'
          ? Math.ceil((new Date(interest.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          ...interest.toObject(),
          profile,
          compatibility,
          mutualInterests: mutual,
          isExpired,
          daysUntilExpiry,
        };
      })
    );

    res.status(200).json({
      success: true,
      interests: interestsWithProfiles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get received interests
// @route   GET /api/interests/received
// @access  Private
export const getReceivedInterests = async (req, res) => {
  try {
    const interests = await Interest.find({ toUserId: req.user.id })
      .populate('fromUserId', 'email phone')
      .sort({ createdAt: -1 });

    // Get profiles for each interest
    const interestsWithProfiles = await Promise.all(
      interests.map(async (interest) => {
        const profile = await Profile.findOne({ userId: interest.fromUserId._id });
        const myProfile = await Profile.findOne({ userId: req.user.id });
        
        // Calculate compatibility score
        const { calculateCompatibility, getMutualInterests } = await import('../utils/compatibilityCalculator.js');
        const compatibility = myProfile && profile ? await calculateCompatibility(myProfile._id, profile._id) : 0;
        const mutual = myProfile && profile ? getMutualInterests(myProfile, profile) : [];
        
        // Check if expired
        const isExpired = interest.expiresAt && new Date(interest.expiresAt) <= new Date() && interest.status === 'pending';
        const daysUntilExpiry = interest.expiresAt && interest.status === 'pending'
          ? Math.ceil((new Date(interest.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
          : null;

        return {
          ...interest.toObject(),
          profile,
          compatibility,
          mutualInterests: mutual,
          isExpired,
          daysUntilExpiry,
        };
      })
    );

    res.status(200).json({
      success: true,
      interests: interestsWithProfiles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get mutual matches
// @route   GET /api/interests/matches
// @access  Private
export const getMutualMatches = async (req, res) => {
  try {
    const matches = await Interest.find({
      $or: [{ fromUserId: req.user.id }, { toUserId: req.user.id }],
      status: 'accepted',
    })
      .populate('fromUserId', 'email phone')
      .populate('toUserId', 'email phone')
      .sort({ updatedAt: -1 });

    // Get profiles for matches
    const matchesWithProfiles = await Promise.all(
      matches.map(async (match) => {
        const otherUserId =
          match.fromUserId._id.toString() === req.user.id
            ? match.toUserId._id
            : match.fromUserId._id;
        const profile = await Profile.findOne({ userId: otherUserId });
        const myProfile = await Profile.findOne({ userId: req.user.id });
        
        // Calculate compatibility score
        const { calculateCompatibility, getMutualInterests } = await import('../utils/compatibilityCalculator.js');
        const compatibility = myProfile && profile ? await calculateCompatibility(myProfile._id, profile._id) : 0;
        const mutual = myProfile && profile ? getMutualInterests(myProfile, profile) : [];

        return {
          ...match.toObject(),
          profile,
          compatibility,
          mutualInterests: mutual,
        };
      })
    );

    res.status(200).json({
      success: true,
      matches: matchesWithProfiles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get interest history with a specific user
// @route   GET /api/interests/history/:userId
// @access  Private
export const getInterestHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Get all interests between current user and target user (both directions)
    const interests = await Interest.find({
      $or: [
        { fromUserId: currentUserId, toUserId: userId },
        { fromUserId: userId, toUserId: currentUserId },
      ],
    })
      .populate('fromUserId', 'email phone')
      .populate('toUserId', 'email phone')
      .sort({ createdAt: -1 });

    // Get profiles
    const currentUserProfile = await Profile.findOne({ userId: currentUserId });
    const targetUserProfile = await Profile.findOne({ userId });

    // Calculate compatibility
    const { calculateCompatibility, getMutualInterests } = await import('../utils/compatibilityCalculator.js');
    const compatibility = currentUserProfile && targetUserProfile
      ? await calculateCompatibility(currentUserProfile._id, targetUserProfile._id)
      : 0;
    const mutual = currentUserProfile && targetUserProfile
      ? getMutualInterests(currentUserProfile, targetUserProfile)
      : [];

    res.status(200).json({
      success: true,
      interests,
      compatibility,
      mutualInterests: mutual,
      timeline: interests.map(interest => ({
        date: interest.createdAt,
        action: interest.fromUserId._id.toString() === currentUserId
          ? interest.status === 'pending' ? 'sent' : interest.status === 'accepted' ? 'accepted_by_them' : 'rejected_by_them'
          : interest.status === 'pending' ? 'received' : interest.status === 'accepted' ? 'accepted_by_you' : 'rejected_by_you',
        status: interest.status,
        message: interest.message,
      })),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Withdraw interest
// @route   DELETE /api/interests/:id
// @access  Private
export const withdrawInterest = async (req, res) => {
  try {
    const interest = await Interest.findById(req.params.id);

    if (!interest) {
      return res.status(404).json({
        success: false,
        message: 'Interest not found',
      });
    }

    // Check if user is the sender
    if (interest.fromUserId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to withdraw this interest',
      });
    }

    // Can only withdraw if status is pending
    if (interest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Can only withdraw pending interests',
      });
    }

    await Interest.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Interest withdrawn successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Bulk accept interests
// @route   POST /api/interests/bulk-accept
// @access  Private
export const bulkAcceptInterests = async (req, res) => {
  try {
    const { interestIds } = req.body;

    if (!interestIds || !Array.isArray(interestIds) || interestIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of interest IDs',
      });
    }

    const interests = await Interest.find({
      _id: { $in: interestIds },
      toUserId: req.user.id,
      status: 'pending',
    });

    if (interests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid interests found to accept',
      });
    }

    // Accept all interests
    await Interest.updateMany(
      { _id: { $in: interests.map(i => i._id) } },
      { status: 'accepted' }
    );

    // Create notifications and chats for each accepted interest
    for (const interest of interests) {
      const receiverProfile = await Profile.findOne({ userId: interest.toUserId });
      
      await Notification.create({
        userId: interest.fromUserId,
        type: 'interest_accepted',
        title: 'Interest Accepted',
        message: `${receiverProfile?.personalInfo?.firstName || 'Someone'} accepted your interest`,
        relatedUserId: interest.toUserId,
        relatedProfileId: receiverProfile?._id,
        relatedInterestId: interest._id,
      });

      // Create chat room if it doesn't exist
      const chat = await Chat.findOne({
        participants: { $all: [interest.fromUserId, interest.toUserId] },
      });

      if (!chat) {
        await Chat.create({
          participants: [interest.fromUserId, interest.toUserId],
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `${interests.length} interest(s) accepted successfully`,
      count: interests.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Bulk reject interests
// @route   POST /api/interests/bulk-reject
// @access  Private
export const bulkRejectInterests = async (req, res) => {
  try {
    const { interestIds } = req.body;

    if (!interestIds || !Array.isArray(interestIds) || interestIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of interest IDs',
      });
    }

    const interests = await Interest.find({
      _id: { $in: interestIds },
      toUserId: req.user.id,
      status: 'pending',
    });

    if (interests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid interests found to reject',
      });
    }

    // Reject all interests
    await Interest.updateMany(
      { _id: { $in: interests.map(i => i._id) } },
      { status: 'rejected' }
    );

    // Create notifications for each rejected interest
    for (const interest of interests) {
      const receiverProfile = await Profile.findOne({ userId: interest.toUserId });
      
      await Notification.create({
        userId: interest.fromUserId,
        type: 'interest_rejected',
        title: 'Interest Rejected',
        message: `${receiverProfile?.personalInfo?.firstName || 'Someone'} rejected your interest`,
        relatedUserId: interest.toUserId,
        relatedProfileId: receiverProfile?._id,
        relatedInterestId: interest._id,
      });
    }

    res.status(200).json({
      success: true,
      message: `${interests.length} interest(s) rejected successfully`,
      count: interests.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

