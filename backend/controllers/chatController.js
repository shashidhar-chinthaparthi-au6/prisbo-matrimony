import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import Interest from '../models/Interest.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');

// @desc    Get all chats
// @route   GET /api/chats
// @access  Private
export const getChats = async (req, res) => {
  try {
    // Update user's last chat section access time
    await User.findByIdAndUpdate(req.user.id, {
      lastChatSectionAccess: new Date(),
    });

    const chats = await Chat.find({
      participants: req.user.id,
    })
      .populate('participants', 'email phone')
      .sort({ lastMessageAt: -1 });

    // Get profile info for each participant and unread count
    const chatsWithProfiles = await Promise.all(
      chats.map(async (chat) => {
        const otherParticipant = chat.participants.find(
          (p) => p._id.toString() !== req.user.id
        );
        const Profile = (await import('../models/Profile.js')).default;
        const Message = (await import('../models/Message.js')).default;
        const profile = await Profile.findOne({ userId: otherParticipant._id });
        
        // Get unread message count
        const unreadCount = await Message.countDocuments({
          chatId: chat._id,
          receiverId: req.user.id,
          isRead: false,
        });
        
        // Get other participant's availability status
        const otherUser = await User.findById(otherParticipant._id);
        const isOnline = otherUser?.lastChatSectionAccess && 
          (new Date() - new Date(otherUser.lastChatSectionAccess)) < 30000; // 30 seconds
        
        return {
          ...chat.toObject(),
          otherParticipant,
          profile,
          unreadCount,
          isOnline,
        };
      })
    );

    res.status(200).json({
      success: true,
      chats: chatsWithProfiles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get messages for a chat
// @route   GET /api/chats/:chatId/messages
// @access  Private
export const getMessages = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    // Check if user is participant
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this chat',
      });
    }

    const messages = await Message.find({ chatId: req.params.chatId })
      .populate('senderId', 'email phone')
      .populate('receiverId', 'email phone')
      .sort({ createdAt: 1 });

    // Get profile info for each sender
    const Profile = (await import('../models/Profile.js')).default;
    const messagesWithProfiles = await Promise.all(
      messages.map(async (message) => {
        const profile = await Profile.findOne({ userId: message.senderId._id });
        const messageObj = message.toObject();
        messageObj.senderProfile = profile;
        return messageObj;
      })
    );

    // Mark messages as read
    await Message.updateMany(
      {
        chatId: req.params.chatId,
        receiverId: req.user.id,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );

    // Update last viewed timestamp for this user in the chat
    if (!chat.lastViewedBy) {
      chat.lastViewedBy = {};
    }
    chat.lastViewedBy[req.user.id.toString()] = new Date();
    await chat.save();

    // Update user's last chat section access time (they're in chat section)
    await User.findByIdAndUpdate(req.user.id, {
      lastChatSectionAccess: new Date(),
    });

    res.status(200).json({
      success: true,
      messages: messagesWithProfiles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Send message
// @route   POST /api/chats/:chatId/messages
// @access  Private
export const sendMessage = async (req, res) => {
  try {
    const { content, type = 'text' } = req.body;
    const chatId = req.params.chatId;

    if (!content && !req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please provide message content or image',
      });
    }

    const chat = await Chat.findById(chatId);

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    // Check if user is participant
    if (!chat.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to send message in this chat',
      });
    }

    // Check if interest is accepted
    const interest = await Interest.findOne({
      $or: [
        { fromUserId: chat.participants[0], toUserId: chat.participants[1] },
        { fromUserId: chat.participants[1], toUserId: chat.participants[0] },
      ],
      status: 'accepted',
    });

    if (!interest) {
      return res.status(403).json({
        success: false,
        message: 'Cannot send message. Interest not accepted',
      });
    }

    const receiverId = chat.participants.find(
      (p) => p.toString() !== req.user.id
    );

    let imageUrl = null;
    if (req.file) {
      // File is already saved locally by multer
      const relativePath = req.file.path.replace(uploadsDir, '').replace(/\\/g, '/');
      imageUrl = `/uploads${relativePath}`;
    }

    const message = await Message.create({
      chatId,
      senderId: req.user.id,
      receiverId,
      content: content || '',
      type: req.file ? 'image' : type,
      imageUrl,
    });

    // Update chat last message
    chat.lastMessage = content || 'Image';
    chat.lastMessageAt = new Date();
    await chat.save();

    // Get sender profile for notification
    const Profile = (await import('../models/Profile.js')).default;
    const senderProfile = await Profile.findOne({ userId: req.user.id });

    // Check if receiver is currently available (in the chat section)
    // Receiver is considered available if they accessed chat section within last 30 seconds
    const receiver = await User.findById(receiverId);
    const isReceiverAvailable = receiver?.lastChatSectionAccess && 
      (new Date() - new Date(receiver.lastChatSectionAccess)) < 30000; // 30 seconds

    // Only push notification if receiver is NOT available (not in chat section)
    // If receiver is available/in chat section, they can see messages in real-time, so no notification needed
    if (!isReceiverAvailable) {
      await Notification.create({
        userId: receiverId,
        type: 'new_message',
        title: 'New Message',
        message: `${senderProfile?.personalInfo?.firstName || 'Someone'} sent you a message: ${content?.substring(0, 50) || 'Image'}`,
        relatedUserId: req.user.id,
        relatedProfileId: senderProfile?._id,
        relatedChatId: chatId,
      });
    }

    const populatedMessage = await Message.findById(message._id)
      .populate('senderId', 'email phone')
      .populate('receiverId', 'email phone');

    res.status(201).json({
      success: true,
      message: populatedMessage,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get or create chat
// @route   POST /api/chats
// @access  Private
export const getOrCreateChat = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide userId',
      });
    }

    // Check if interest is accepted
    const interest = await Interest.findOne({
      $or: [
        { fromUserId: req.user.id, toUserId: userId },
        { fromUserId: userId, toUserId: req.user.id },
      ],
      status: 'accepted',
    });

    if (!interest) {
      return res.status(403).json({
        success: false,
        message: 'Cannot create chat. Interest not accepted',
      });
    }

    let chat = await Chat.findOne({
      participants: { $all: [req.user.id, userId] },
    });

    if (!chat) {
      chat = await Chat.create({
        participants: [req.user.id, userId],
      });
    }

    const populatedChat = await Chat.findById(chat._id).populate(
      'participants',
      'email phone'
    );

    res.status(200).json({
      success: true,
      chat: populatedChat,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

