import express from 'express';
import {
  sendInterest,
  acceptInterest,
  rejectInterest,
  getSentInterests,
  getReceivedInterests,
  getMutualMatches,
  getInterestHistory,
  withdrawInterest,
  bulkAcceptInterests,
  bulkRejectInterests,
} from '../controllers/interestController.js';
import { protect } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';
import { requireApprovedProfile } from '../middleware/profileVerification.js';

const router = express.Router();

router.post('/', protect, requireApprovedProfile, requireActiveSubscription, sendInterest);
router.put('/:id/accept', protect, requireApprovedProfile, acceptInterest);
router.put('/:id/reject', protect, requireApprovedProfile, rejectInterest);
router.delete('/:id', protect, requireApprovedProfile, withdrawInterest);
router.post('/bulk-accept', protect, requireApprovedProfile, bulkAcceptInterests);
router.post('/bulk-reject', protect, requireApprovedProfile, bulkRejectInterests);
router.get('/sent', protect, requireApprovedProfile, getSentInterests);
router.get('/received', protect, requireApprovedProfile, getReceivedInterests);
router.get('/matches', protect, requireApprovedProfile, getMutualMatches);
router.get('/history/:userId', protect, requireApprovedProfile, getInterestHistory);

export default router;

