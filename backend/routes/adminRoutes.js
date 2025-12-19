import express from 'express';
import {
  getAllUsers,
  getAllProfiles,
  updateProfileStatus,
  blockUser,
  getStats,
} from '../controllers/adminController.js';
import {
  getPendingProfiles,
  getProfileById,
  approveProfile,
  rejectProfile,
  updateProfileField,
  deleteProfilePhoto,
  getVerificationStats,
} from '../controllers/adminProfileController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(admin);

router.get('/users', getAllUsers);
router.get('/profiles', getAllProfiles);
router.put('/profiles/:id/status', updateProfileStatus);
router.put('/users/:id/block', blockUser);
router.get('/stats', getStats);

// Profile Verification Routes
router.get('/profiles/pending', getPendingProfiles);
router.get('/profiles/verification-stats', getVerificationStats);
router.get('/profiles/:id', getProfileById);
router.put('/profiles/:id/approve', approveProfile);
router.put('/profiles/:id/reject', rejectProfile);
router.put('/profiles/:id/update', updateProfileField);
router.delete('/profiles/:id/photos/:photoId', deleteProfilePhoto);

export default router;

