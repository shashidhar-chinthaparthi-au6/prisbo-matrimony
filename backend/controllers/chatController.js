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

    // Get current user's blocked users list
    const currentUser = await User.findById(req.user.id);
    const blockedUserIds = currentUser?.blockedUsers || [];

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
        
        // Filter out chats with blocked users
        if (blockedUserIds.some(id => id.toString() === otherParticipant._id.toString())) {
          return null;
        }
        
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
        
        // Get typing indicators
        const typingUserIds = (chat.typingUsers || [])
          .filter(t => {
            const now = new Date();
            return t.userId.toString() !== req.user.id.toString() && t.typingUntil > now;
          })
          .map(t => t.userId.toString());
        
        return {
          ...chat.toObject(),
          otherParticipant,
          profile,
          unreadCount,
          isOnline,
          isTyping: typingUserIds.includes(otherParticipant._id.toString()),
        };
      })
    );
    
    // Filter out null values (blocked users)
    const filteredChats = chatsWithProfiles.filter(chat => chat !== null);

    res.status(200).json({
      success: true,
      chats: filteredChats,
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

    // Check if either user has blocked the other
    const currentUser = await User.findById(req.user.id);
    const otherParticipantId = chat.participants.find(
      (p) => p.toString() !== req.user.id
    );
    const otherUser = await User.findById(otherParticipantId);
    
    if (currentUser?.blockedUsers?.includes(otherParticipantId) || 
        otherUser?.blockedUsers?.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Cannot access chat. User is blocked.',
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

    // Check if receiver has blocked the sender
    const receiverId = chat.participants.find(
      (p) => p.toString() !== req.user.id
    );
    const receiver = await User.findById(receiverId);
    if (receiver?.blockedUsers?.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You have been blocked by this user',
      });
    }

    // Check if sender has blocked the receiver
    const sender = await User.findById(req.user.id);
    if (sender?.blockedUsers?.includes(receiverId)) {
      return res.status(403).json({
        success: false,
        message: 'You have blocked this user',
      });
    }

    // Check if interest is accepted (only for user_to_user chats)
    // Support chats don't require interest acceptance
    if (chat.chatType === 'user_to_user') {
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
    }

    let imageUrl = null;
    let audioUrl = null;
    let videoUrl = null;
    let fileUrl = null;
    let fileName = null;
    let fileSize = null;
    let messageType = type || 'text';

    if (req.file) {
      // File is already saved locally by multer
      const relativePath = req.file.path.replace(uploadsDir, '').replace(/\\/g, '/');
      const filePath = `/uploads${relativePath}`;
      
      // Determine file type based on MIME type
      const mimeType = req.file.mimetype;
      if (mimeType.startsWith('image/')) {
        imageUrl = filePath;
        messageType = 'image';
      } else if (mimeType.startsWith('audio/') || mimeType === 'audio/mpeg' || mimeType === 'audio/wav' || mimeType === 'audio/ogg') {
        audioUrl = filePath;
        messageType = 'audio';
      } else if (mimeType.startsWith('video/')) {
        videoUrl = filePath;
        messageType = 'video';
      } else {
        fileUrl = filePath;
        fileName = req.file.originalname;
        fileSize = req.file.size;
        messageType = 'file';
      }
    }

    const message = await Message.create({
      chatId,
      senderId: req.user.id,
      receiverId,
      content: content || (req.file ? (fileName || 'Media') : ''),
      type: messageType,
      imageUrl,
      audioUrl,
      videoUrl,
      fileUrl,
      fileName,
      fileSize,
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
    // Note: receiver was already fetched earlier in the function
    const isReceiverAvailable = receiver?.lastChatSectionAccess && 
      (new Date() - new Date(receiver.lastChatSectionAccess)) < 30000; // 30 seconds

    // Only push notification if receiver is NOT available (not in chat section)
    // If receiver is available/in chat section, they can see messages in real-time, so no notification needed
    if (!isReceiverAvailable) {
      // Determine notification type based on chat type
      const notificationType = chat.chatType && chat.chatType !== 'user_to_user' 
        ? 'support_message' 
        : 'new_message';
      
      await Notification.create({
        userId: receiverId,
        type: notificationType,
        title: chat.chatType && chat.chatType !== 'user_to_user' ? 'New Support Message' : 'New Message',
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

    // Prevent chat with self
    if (req.user.id === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create chat with yourself',
      });
    }

    // Check if target user exists and is active
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    if (!targetUser.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Cannot chat with an inactive user',
      });
    }

    // Check if target user has blocked the sender
    if (targetUser.blockedUsers?.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'You have been blocked by this user',
      });
    }

    // Check if sender has blocked the target user
    const senderUser = await User.findById(req.user.id);
    if (senderUser?.blockedUsers?.includes(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You have blocked this user',
      });
    }

    // Check if interest is accepted (only for user_to_user chats)
    // Support chats don't require interest acceptance
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
      chatType: 'user_to_user',
    });

    if (!chat) {
      chat = await Chat.create({
        participants: [req.user.id, userId],
        chatType: 'user_to_user',
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

// @desc    Get support chats
// @route   GET /api/chats/support
// @access  Private (Superadmin, Vendor, User)
export const getSupportChats = async (req, res) => {
  try {
    const userRole = req.user.role;
    let query = { participants: req.user.id };

    // Filter by chat type based on role
    if (userRole === 'super_admin') {
      query.chatType = { $in: ['support_superadmin_vendor', 'support_superadmin_user'] };
    } else if (userRole === 'vendor') {
      query.chatType = { $in: ['support_superadmin_vendor', 'support_vendor_user'] };
    } else {
      // Regular users can see support chats with superadmin or vendor
      query.chatType = { $in: ['support_superadmin_user', 'support_vendor_user'] };
    }

    const chats = await Chat.find(query)
      .populate('participants', 'email phone role companyName')
      .sort({ lastMessageAt: -1 });

    // Get unread counts and other participant info
    const chatsWithDetails = await Promise.all(
      chats.map(async (chat) => {
        const otherParticipant = chat.participants.find(
          (p) => p._id.toString() !== req.user.id
        );
        
        const unreadCount = await Message.countDocuments({
          chatId: chat._id,
          receiverId: req.user.id,
          isRead: false,
        });
        
        const otherUser = await User.findById(otherParticipant._id);
        const isOnline = otherUser?.lastChatSectionAccess && 
          (new Date() - new Date(otherUser.lastChatSectionAccess)) < 30000;
        
        return {
          ...chat.toObject(),
          otherParticipant,
          unreadCount,
          isOnline,
        };
      })
    );

    res.status(200).json({
      success: true,
      chats: chatsWithDetails,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get or create support chat between superadmin and vendor
// @route   GET /api/chats/support/superadmin-vendor/:vendorId
// @route   POST /api/chats/support/superadmin-vendor
// @access  Private (Superadmin, Vendor)
export const getOrCreateSuperAdminVendorChat = async (req, res) => {
  try {
    const vendorId = req.params.vendorId || req.body.vendorId;
    const userRole = req.user.role;

    // Superadmin can chat with any vendor
    // Vendor can only chat with superadmin (themselves)
    if (userRole === 'super_admin') {
      if (!vendorId) {
        return res.status(400).json({
          success: false,
          message: 'Vendor ID is required',
        });
      }

      const vendor = await User.findById(vendorId);
      if (!vendor || vendor.role !== 'vendor') {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found',
        });
      }

      let chat = await Chat.findOne({
        participants: { $all: [req.user.id, vendorId] },
        chatType: 'support_superadmin_vendor',
      });

      if (!chat) {
        // Check if there's any existing chat with these participants (might be user_to_user)
        const existingChat = await Chat.findOne({
          participants: { $all: [req.user.id, vendorId] },
        });
        
        if (existingChat) {
          // If there's an existing chat with different type, return it or create support chat
          // For support chats, we allow multiple chats with same participants
          // Try to create, but handle duplicate key error
          try {
            chat = await Chat.create({
              participants: [req.user.id, vendorId],
              chatType: 'support_superadmin_vendor',
            });
          } catch (createError) {
            if (createError.code === 11000) {
              // Duplicate key - try to find the support chat again
              chat = await Chat.findOne({
                participants: { $all: [req.user.id, vendorId] },
                chatType: 'support_superadmin_vendor',
              });
              // If still not found, use the existing chat
              if (!chat) {
                chat = existingChat;
              }
            } else {
              throw createError;
            }
          }
        } else {
          chat = await Chat.create({
            participants: [req.user.id, vendorId],
            chatType: 'support_superadmin_vendor',
          });
        }
      }

      const populatedChat = await Chat.findById(chat._id)
        .populate('participants', 'email phone role companyName');

      res.status(200).json({
        success: true,
        chat: populatedChat,
      });
    } else if (userRole === 'vendor') {
      // Vendor gets or creates chat with superadmin
      const superAdmin = await User.findOne({ role: 'super_admin' });
      if (!superAdmin) {
        return res.status(404).json({
          success: false,
          message: 'Super admin not found',
        });
      }

      let chat = await Chat.findOne({
        participants: { $all: [req.user.id, superAdmin._id] },
        chatType: 'support_superadmin_vendor',
      });

      if (!chat) {
        // Check if there's any existing chat with these participants
        const existingChat = await Chat.findOne({
          participants: { $all: [req.user.id, superAdmin._id] },
        });
        
        if (existingChat) {
          try {
            chat = await Chat.create({
              participants: [req.user.id, superAdmin._id],
              chatType: 'support_superadmin_vendor',
            });
          } catch (createError) {
            if (createError.code === 11000) {
              chat = await Chat.findOne({
                participants: { $all: [req.user.id, superAdmin._id] },
                chatType: 'support_superadmin_vendor',
              });
              if (!chat) {
                chat = existingChat;
              }
            } else {
              throw createError;
            }
          }
        } else {
          chat = await Chat.create({
            participants: [req.user.id, superAdmin._id],
            chatType: 'support_superadmin_vendor',
          });
        }
      }

      const populatedChat = await Chat.findById(chat._id)
        .populate('participants', 'email phone role companyName');

      res.status(200).json({
        success: true,
        chat: populatedChat,
      });
    } else {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this operation',
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get or create support chat between superadmin and user
// @route   GET /api/chats/support/superadmin-user/:userId
// @route   POST /api/chats/support/superadmin-user
// @access  Private (Superadmin only)
export const getOrCreateSuperAdminUserChat = async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admin can create support chats with users',
      });
    }

    const userId = req.params.userId || req.body.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== 'user') {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if user's profile was created by vendor
    const Profile = (await import('../models/Profile.js')).default;
    const userProfile = await Profile.findOne({ userId });
    
    if (userProfile && userProfile.isVendorCreated) {
      return res.status(403).json({
        success: false,
        message: 'Cannot create support chat. This user\'s profile was created by a vendor. Please contact the vendor for support.',
      });
    }

    let chat = await Chat.findOne({
      participants: { $all: [req.user.id, userId] },
      chatType: 'support_superadmin_user',
    });

    if (!chat) {
      // Check if there's any existing chat with these participants
      const existingChat = await Chat.findOne({
        participants: { $all: [req.user.id, userId] },
      });
      
      if (existingChat) {
        // If existing chat is the right type, use it
        if (existingChat.chatType === 'support_superadmin_user') {
          chat = existingChat;
        } else {
          // If different type, try to create support chat, but handle duplicate key error
          try {
            chat = await Chat.create({
              participants: [req.user.id, userId],
              chatType: 'support_superadmin_user',
            });
          } catch (createError) {
            if (createError.code === 11000) {
              // Duplicate key - return existing chat (might be user_to_user)
              // For support, we'll use the existing chat
              chat = existingChat;
            } else {
              throw createError;
            }
          }
        }
      } else {
        chat = await Chat.create({
          participants: [req.user.id, userId],
          chatType: 'support_superadmin_user',
        });
      }
    }

    const populatedChat = await Chat.findById(chat._id)
      .populate('participants', 'email phone role');

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

// @desc    Get or create support chat between vendor and their user
// @route   GET /api/chats/support/vendor-user/:userId
// @route   POST /api/chats/support/vendor-user
// @access  Private (Vendor only)
export const getOrCreateVendorUserChat = async (req, res) => {
  try {
    if (req.user.role !== 'vendor') {
      return res.status(403).json({
        success: false,
        message: 'Only vendors can create support chats with their users',
      });
    }

    const userId = req.params.userId || req.body.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }

    const user = await User.findById(userId);
    if (!user || user.role !== 'user') {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if vendor created this user's profile
    const Profile = (await import('../models/Profile.js')).default;
    const userProfile = await Profile.findOne({ 
      userId,
      createdBy: req.user.id,
      isVendorCreated: true,
    });
    
    if (!userProfile) {
      return res.status(403).json({
        success: false,
        message: 'You can only chat with users whose profiles you created',
      });
    }

    let chat = await Chat.findOne({
      participants: { $all: [req.user.id, userId] },
      chatType: 'support_vendor_user',
    });

    if (!chat) {
      // Check if there's any existing chat with these participants
      const existingChat = await Chat.findOne({
        participants: { $all: [req.user.id, userId] },
      });
      
      if (existingChat) {
        // If existing chat is the right type, use it
        if (existingChat.chatType === 'support_vendor_user') {
          chat = existingChat;
        } else {
          // If different type, try to create support chat, but handle duplicate key error
          try {
            chat = await Chat.create({
              participants: [req.user.id, userId],
              chatType: 'support_vendor_user',
            });
          } catch (createError) {
            if (createError.code === 11000) {
              // Duplicate key - return existing chat
              chat = existingChat;
            } else {
              throw createError;
            }
          }
        }
      } else {
        chat = await Chat.create({
          participants: [req.user.id, userId],
          chatType: 'support_vendor_user',
        });
      }
    }

    const populatedChat = await Chat.findById(chat._id)
      .populate('participants', 'email phone role');

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


// @desc    Delete/Unsend message
// @route   DELETE /api/chats/:chatId/messages/:messageId
// @access  Private
export const deleteMessage = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Check if message belongs to this chat
    if (message.chatId.toString() !== chatId) {
      return res.status(400).json({
        success: false,
        message: 'Message does not belong to this chat',
      });
    }

    // Check if user is the sender
    if (message.senderId.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own messages',
      });
    }

    // Check if message is too old (e.g., can only delete within 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (new Date(message.createdAt) < fiveMinutesAgo) {
      return res.status(400).json({
        success: false,
        message: 'Messages can only be deleted within 5 minutes of sending',
      });
    }

    // Delete the message
    await Message.findByIdAndDelete(messageId);

    // Update chat last message if this was the last message
    const chat = await Chat.findById(chatId);
    if (chat && chat.lastMessageAt && new Date(chat.lastMessageAt).getTime() === new Date(message.createdAt).getTime()) {
      // Find the new last message
      const lastMessage = await Message.findOne({ chatId })
        .sort({ createdAt: -1 });
      
      if (lastMessage) {
        chat.lastMessage = lastMessage.content || 'Image';
        chat.lastMessageAt = lastMessage.createdAt;
      } else {
        chat.lastMessage = null;
        chat.lastMessageAt = null;
      }
      await chat.save();
    }

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get media gallery for a chat
// @route   GET /api/chats/:chatId/media
// @access  Private
export const getMediaGallery = async (req, res) => {
  try {
    const { chatId } = req.params;

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
        message: 'Not authorized to access this chat',
      });
    }

    // Get all media messages (images and videos)
    const mediaMessages = await Message.find({
      chatId,
      type: { $in: ['image', 'video'] },
    })
      .populate('senderId', 'email phone')
      .sort({ createdAt: -1 });

    // Format media items
    const media = mediaMessages.map(msg => ({
      _id: msg._id,
      type: msg.type,
      url: msg.imageUrl || msg.videoUrl,
      thumbnail: msg.type === 'video' ? msg.imageUrl : msg.imageUrl, // Can add thumbnail generation later
      senderId: msg.senderId,
      createdAt: msg.createdAt,
    }));

    res.status(200).json({
      success: true,
      media,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Add reaction to a message
// @route   POST /api/chats/:chatId/messages/:messageId/reactions
// @access  Private
export const addReaction = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an emoji',
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Check if message belongs to this chat
    if (message.chatId.toString() !== chatId) {
      return res.status(400).json({
        success: false,
        message: 'Message does not belong to this chat',
      });
    }

    // Check if user already reacted with this emoji
    const existingReaction = message.reactions.find(
      r => r.userId.toString() === req.user.id.toString() && r.emoji === emoji
    );

    if (existingReaction) {
      return res.status(400).json({
        success: false,
        message: 'You have already reacted with this emoji',
      });
    }

    // Add reaction
    message.reactions.push({
      userId: req.user.id,
      emoji,
      createdAt: new Date(),
    });

    await message.save();

    res.status(200).json({
      success: true,
      message: 'Reaction added successfully',
      reactions: message.reactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Remove reaction from a message
// @route   DELETE /api/chats/:chatId/messages/:messageId/reactions
// @access  Private
export const removeReaction = async (req, res) => {
  try {
    const { chatId, messageId } = req.params;
    const { emoji } = req.body;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found',
      });
    }

    // Check if message belongs to this chat
    if (message.chatId.toString() !== chatId) {
      return res.status(400).json({
        success: false,
        message: 'Message does not belong to this chat',
      });
    }

    // Remove reaction
    message.reactions = message.reactions.filter(
      r => !(r.userId.toString() === req.user.id.toString() && r.emoji === emoji)
    );

    await message.save();

    res.status(200).json({
      success: true,
      message: 'Reaction removed successfully',
      reactions: message.reactions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Set typing indicator
// @route   POST /api/chats/:chatId/typing
// @access  Private
export const setTyping = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized to set typing in this chat' });
    }

    // Update typing indicator (stored in chat or separate collection)
    // For simplicity, we'll use a timestamp that expires after 3 seconds
    if (!chat.typingUsers) {
      chat.typingUsers = [];
    }
    
    const typingUntil = new Date(Date.now() + 3000); // 3 seconds from now
    
    const existingIndex = chat.typingUsers.findIndex(
      (tu) => tu.userId.toString() === userId
    );
    
    if (existingIndex >= 0) {
      chat.typingUsers[existingIndex].typingUntil = typingUntil;
    } else {
      chat.typingUsers.push({
        userId,
        typingUntil,
      });
    }
    
    await chat.save();

    res.status(200).json({ success: true, message: 'Typing indicator set' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get typing users
// @route   GET /api/chats/:chatId/typing
// @access  Private
export const getTyping = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    if (!chat.participants.includes(userId)) {
      return res.status(403).json({ success: false, message: 'Not authorized to get typing status for this chat' });
    }

    // Filter out typing indicators that have expired
    const now = new Date();
    const activeTypingUsers = (chat.typingUsers || [])
      .filter((tu) => {
        return tu.typingUntil && new Date(tu.typingUntil) > now && tu.userId.toString() !== userId; // Exclude self
      })
      .map((tu) => tu.userId);

    res.status(200).json({ success: true, typingUsers: activeTypingUsers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Block user
// @route   POST /api/chats/block/:userId
// @access  Private
export const blockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot block yourself',
      });
    }

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.blockedUsers) {
      user.blockedUsers = [];
    }

    if (user.blockedUsers.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already blocked',
      });
    }

    user.blockedUsers.push(userId);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User blocked successfully',
      blockedUsers: user.blockedUsers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Unblock user
// @route   POST /api/chats/unblock/:userId
// @access  Private
export const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const user = await User.findById(currentUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    if (!user.blockedUsers || !user.blockedUsers.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is not blocked',
      });
    }

    user.blockedUsers = user.blockedUsers.filter(
      (id) => id.toString() !== userId
    );
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User unblocked successfully',
      blockedUsers: user.blockedUsers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get blocked users
// @route   GET /api/chats/blocked
// @access  Private
export const getBlockedUsers = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const blockedUsers = await User.find({
      _id: { $in: user.blockedUsers || [] },
    }).select('email phone role companyName');

    res.status(200).json({
      success: true,
      blockedUsers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
