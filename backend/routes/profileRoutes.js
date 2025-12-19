import express from 'express';
import {
  createOrUpdateProfile,
  getMyProfile,
  getProfileById,
  uploadPhotos,
  deletePhoto,
  setPrimaryPhoto,
} from '../controllers/profileController.js';
import { protect } from '../middleware/auth.js';
import { requireActiveSubscription } from '../middleware/subscription.js';
import { uploadMultiple } from '../middleware/upload.js';

const router = express.Router();

router.post('/', protect, createOrUpdateProfile);
router.put('/:id', protect, createOrUpdateProfile);
router.get('/me', protect, getMyProfile);
router.get('/:id', protect, requireActiveSubscription, getProfileById);
router.post('/photos', protect, uploadMultiple, uploadPhotos);
router.delete('/photos/:photoId', protect, deletePhoto);
router.put('/photos/:photoId/primary', protect, setPrimaryPhoto);

export default router;

