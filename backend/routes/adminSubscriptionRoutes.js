import express from 'express';
import {
  getAllSubscriptions,
  getPendingSubscriptions,
  getSubscriptionById,
  approveSubscription,
  rejectSubscription,
  cancelSubscription,
  reactivateSubscription,
  getSubscriptionStats,
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
  bulkApproveSubscriptions,
  bulkRejectSubscriptions,
  bulkDeleteSubscriptions,
  processRefund,
} from '../controllers/adminSubscriptionController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.use(admin);

router.get('/subscriptions', getAllSubscriptions);
router.get('/subscriptions/pending', getPendingSubscriptions);
router.get('/subscriptions/stats', getSubscriptionStats);
router.get('/subscriptions/:id', getSubscriptionById);
router.put('/subscriptions/:id/approve', approveSubscription);
router.put('/subscriptions/:id/reject', rejectSubscription);
router.put('/subscriptions/:id/cancel', cancelSubscription);
router.put('/subscriptions/:id/reactivate', reactivateSubscription);
router.post('/subscriptions/:id/refund', processRefund);
router.post('/subscriptions/bulk-approve', bulkApproveSubscriptions);
router.post('/subscriptions/bulk-reject', bulkRejectSubscriptions);
router.delete('/subscriptions/bulk-delete', bulkDeleteSubscriptions);

router.get('/subscription-plans', getAllPlans);
router.post('/subscription-plans', createPlan);
router.put('/subscription-plans/:id', updatePlan);
router.delete('/subscription-plans/:id', deletePlan);

export default router;

