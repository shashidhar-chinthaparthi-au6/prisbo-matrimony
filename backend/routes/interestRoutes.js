import express from 'express';
import {
  sendInterest,
  acceptInterest,
  rejectInterest,
  getSentInterests,
  getReceivedInterests,
  getMutualMatches,
} from '../controllers/interestController.js';
import { protect } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';

const router = express.Router();

router.post('/', protect, requireActiveSubscription, sendInterest);
router.put('/:id/accept', protect, acceptInterest);
router.put('/:id/reject', protect, rejectInterest);
router.get('/sent', protect, getSentInterests);
router.get('/received', protect, getReceivedInterests);
router.get('/matches', protect, getMutualMatches);

export default router;

