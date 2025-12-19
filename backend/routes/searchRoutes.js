import express from 'express';
import { searchProfiles } from '../controllers/searchController.js';
import { protect } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';

const router = express.Router();

router.get('/', protect, requireActiveSubscription, searchProfiles);

export default router;

