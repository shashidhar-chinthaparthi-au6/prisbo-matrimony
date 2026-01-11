import express from 'express';
import {
  createProfileForPerson,
  getMyProfiles,
  getMyProfileById,
  updateMyProfile,
  deleteMyProfile,
  getMyStats,
  approveProfile,
  rejectProfile,
  updateProfileStatus,
  getMySubscriptions,
  approveSubscription,
  rejectSubscription,
} from '../controllers/vendorController.js';
import { protect, vendor } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(vendor);

router.post('/profiles', createProfileForPerson);
router.get('/profiles', getMyProfiles);
router.get('/profiles/:id', getMyProfileById);
router.put('/profiles/:id', updateMyProfile);
router.put('/profiles/:id/approve', approveProfile);
router.put('/profiles/:id/reject', rejectProfile);
router.put('/profiles/:id/status', updateProfileStatus);
router.delete('/profiles/:id', deleteMyProfile);
router.get('/subscriptions', getMySubscriptions);
router.put('/subscriptions/:id/approve', approveSubscription);
router.put('/subscriptions/:id/reject', rejectSubscription);
router.get('/stats', getMyStats);

export default router;

