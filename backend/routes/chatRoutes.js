import express from 'express';
import {
  getChats,
  getMessages,
  sendMessage,
  getOrCreateChat,
} from '../controllers/chatController.js';
import { protect } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();

router.get('/', protect, getChats);
router.post('/', protect, getOrCreateChat);
router.get('/:chatId/messages', protect, getMessages);
router.post('/:chatId/messages', protect, uploadSingle, sendMessage);

export default router;

