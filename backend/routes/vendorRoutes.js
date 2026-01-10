import express from 'express';
import {
  createProfileForPerson,
  getMyProfiles,
  getMyProfileById,
  updateMyProfile,
  deleteMyProfile,
  getMyStats,
} from '../controllers/vendorController.js';
import { protect, vendor } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(vendor);

router.post('/profiles', createProfileForPerson);
router.get('/profiles', getMyProfiles);
router.get('/profiles/:id', getMyProfileById);
router.put('/profiles/:id', updateMyProfile);
router.delete('/profiles/:id', deleteMyProfile);
router.get('/stats', getMyStats);

export default router;

