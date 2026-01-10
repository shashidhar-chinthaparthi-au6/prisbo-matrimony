import express from 'express';
import { protect } from '../middleware/auth.js';
import { getCurrentTerms, acceptTerms } from '../controllers/termsController.js';

const router = express.Router();

router.use(protect);

router.get('/current', getCurrentTerms);
router.post('/accept', acceptTerms);

export default router;

