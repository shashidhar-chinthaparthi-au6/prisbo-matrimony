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

    if (fromUserId === toUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send interest to yourself',
      });
    }

    // Check if interest already exists
    const existingInterest = await Interest.findOne({
      $or: [
        { fromUserId, toUserId },
        { fromUserId: toUserId, toUserId: fromUserId },
      ],
    });

    if (existingInterest) {
      return res.status(400).json({
        success: false,
        message: 'Interest already exists',
        interest: existingInterest,
      });
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
        return {
          ...interest.toObject(),
          profile,
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
        return {
          ...interest.toObject(),
          profile,
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
        return {
          ...match.toObject(),
          profile,
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

