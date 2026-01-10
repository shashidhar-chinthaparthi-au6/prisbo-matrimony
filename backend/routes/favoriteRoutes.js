import express from 'express';
import {
  addFavorite,
  removeFavorite,
  getFavorites,
  updateFavorite,
  exportFavorites,
} from '../controllers/favoriteController.js';
import { protect } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';
import { requireApprovedProfile } from '../middleware/profileVerification.js';

const router = express.Router();

router.post('/', protect, requireApprovedProfile, requireActiveSubscription, addFavorite);
router.put('/:profileId', protect, requireApprovedProfile, updateFavorite);
router.delete('/:profileId', protect, requireApprovedProfile, removeFavorite);
router.get('/', protect, requireApprovedProfile, getFavorites);
router.get('/export', protect, requireApprovedProfile, exportFavorites);

export default router;

