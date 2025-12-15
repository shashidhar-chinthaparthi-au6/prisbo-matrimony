import express from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.route('/').get(protect, getNotifications);
router.route('/read-all').put(protect, markAllAsRead);
router.route('/delete-all').delete(protect, deleteAllNotifications);
router.route('/:id/read').put(protect, markAsRead);
router.route('/:id').delete(protect, deleteNotification);

export default router;

