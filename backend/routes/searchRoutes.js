import express from 'express';
import { searchProfiles } from '../controllers/searchController.js';
import { protect } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';
import { requireApprovedProfile } from '../middleware/profileVerification.js';

const router = express.Router();

router.get('/', protect, requireApprovedProfile, requireActiveSubscription, searchProfiles);

export default router;

