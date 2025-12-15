import express from 'express';
import {
  getAllUsers,
  getAllProfiles,
  updateProfileStatus,
  blockUser,
  getStats,
} from '../controllers/adminController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(admin);

router.get('/users', getAllUsers);
router.get('/profiles', getAllProfiles);
router.put('/profiles/:id/status', updateProfileStatus);
router.put('/users/:id/block', blockUser);
router.get('/stats', getStats);

export default router;

