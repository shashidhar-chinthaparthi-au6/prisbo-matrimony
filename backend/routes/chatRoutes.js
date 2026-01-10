import express from 'express';
import {
  getChats,
  getMessages,
  sendMessage,
  deleteMessage,
  getOrCreateChat,
  getSupportChats,
  getOrCreateSuperAdminVendorChat,
  getOrCreateSuperAdminUserChat,
  getOrCreateVendorUserChat,
  setTyping,
  getTyping,
  blockUser,
  unblockUser,
  getBlockedUsers,
  getMediaGallery,
  addReaction,
  removeReaction,
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();

// Regular chat routes
router.get('/', protect, getChats);
router.post('/', protect, getOrCreateChat);
router.get('/:chatId/messages', protect, getMessages);
router.post('/:chatId/messages', protect, uploadSingle, sendMessage);
router.delete('/:chatId/messages/:messageId', protect, deleteMessage);
router.get('/:chatId/media', protect, getMediaGallery);
router.post('/:chatId/messages/:messageId/reactions', protect, addReaction);
router.delete('/:chatId/messages/:messageId/reactions', protect, removeReaction);
router.post('/:chatId/typing', protect, setTyping);
router.get('/:chatId/typing', protect, getTyping);

// Block/unblock routes
router.post('/block/:userId', protect, blockUser);
router.post('/unblock/:userId', protect, unblockUser);
router.get('/blocked', protect, getBlockedUsers);

// Support chat routes
router.get('/support', protect, getSupportChats);
router.get('/support/superadmin-vendor/:vendorId', protect, getOrCreateSuperAdminVendorChat);
router.post('/support/superadmin-vendor', protect, getOrCreateSuperAdminVendorChat);
router.get('/support/superadmin-user/:userId', protect, getOrCreateSuperAdminUserChat);
router.post('/support/superadmin-user', protect, getOrCreateSuperAdminUserChat);
router.get('/support/vendor-user/:userId', protect, getOrCreateVendorUserChat);
router.post('/support/vendor-user', protect, getOrCreateVendorUserChat);

export default router;

