import express from 'express';
import {
  addFavorite,
  removeFavorite,
  getFavorites,
} from '../controllers/favoriteController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/', protect, addFavorite);
router.delete('/:profileId', protect, removeFavorite);
router.get('/', protect, getFavorites);

export default router;

