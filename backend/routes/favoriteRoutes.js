import express from 'express';
import {
  addFavorite,
  removeFavorite,
  getFavorites,
} from '../controllers/favoriteController.js';
import { protect } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';

const router = express.Router();

router.post('/', protect, requireActiveSubscription, addFavorite);
router.delete('/:profileId', protect, removeFavorite);
router.get('/', protect, getFavorites);

export default router;

