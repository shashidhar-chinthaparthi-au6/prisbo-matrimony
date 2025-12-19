import express from 'express';
import {
  getPlans,
  getCurrentSubscription,
  getSubscriptionHistory,
  subscribe,
  upgradeSubscription,
  uploadPaymentProof,
  getInvoice,
} from '../controllers/subscriptionController.js';
import { protect } from '../middleware/auth.js';
import { uploadSingle } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);

router.get('/plans', getPlans);
router.get('/current', getCurrentSubscription);
router.get('/history', getSubscriptionHistory);
router.post('/subscribe', subscribe);
router.post('/upgrade', upgradeSubscription);
router.post('/upload-proof', uploadSingle, uploadPaymentProof);
router.get('/:id/invoice', getInvoice);

export default router;

