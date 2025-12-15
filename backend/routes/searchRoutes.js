import express from 'express';
import { searchProfiles } from '../controllers/searchController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/', protect, searchProfiles);

export default router;

