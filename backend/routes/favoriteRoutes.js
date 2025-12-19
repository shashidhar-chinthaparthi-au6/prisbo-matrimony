import express from 'express';
import {
  addFavorite,
  removeFavorite,
  getFavorites,
} from '../controllers/favoriteController.js';
import { protect } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';
import { requireApprovedProfile } from '../middleware/profileVerification.js';

const router = express.Router();

router.post('/', protect, requireApprovedProfile, requireActiveSubscription, addFavorite);
router.delete('/:profileId', protect, requireApprovedProfile, removeFavorite);
router.get('/', protect, requireApprovedProfile, getFavorites);

export default router;

