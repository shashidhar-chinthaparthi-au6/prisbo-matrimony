import express from 'express';
import {
  getAllUsers,
  getAllProfiles,
  getProfileByUserId,
  updateProfileStatus,
  blockUser,
  getStats,
  getVendors,
  createVendor,
  updateVendor,
  bulkBlockUsers,
  bulkDeleteUsers,
} from '../controllers/adminController.js';
import {
  getPendingProfiles,
  getProfileById,
  approveProfile,
  rejectProfile,
  updateProfileField,
  deleteProfilePhoto,
  getVerificationStats,
  bulkApproveProfiles,
  bulkRejectProfiles,
  bulkDeleteProfiles,
  getDeletedProfiles,
  restoreProfile,
  bulkRestoreProfiles,
} from '../controllers/adminProfileController.js';
import { protect, admin, superAdmin } from '../middleware/auth.js';
import { uploadVendorDocuments } from '../middleware/upload.js';

const router = express.Router();

router.use(protect);
router.use(admin);

router.get('/users', getAllUsers);
router.get('/vendors', superAdmin, getVendors); // Only super admin can see all vendors
router.post('/vendors', superAdmin, uploadVendorDocuments, createVendor); // Only super admin can create vendors
router.put('/vendors/:id', superAdmin, uploadVendorDocuments, updateVendor); // Only super admin can update vendors
router.get('/profiles', getAllProfiles);
router.get('/profiles/user/:userId', getProfileByUserId);
router.put('/profiles/:id/status', updateProfileStatus);
router.put('/users/:id/block', blockUser);
router.get('/stats', getStats);

// Profile Verification Routes - Specific routes must come before parameterized routes
router.get('/profiles/pending', getPendingProfiles);
router.get('/profiles/verification-stats', getVerificationStats);
router.get('/profiles/deleted', getDeletedProfiles);
router.post('/profiles/bulk-approve', bulkApproveProfiles);
router.post('/profiles/bulk-reject', bulkRejectProfiles);
router.delete('/profiles/bulk-delete', bulkDeleteProfiles);
router.put('/profiles/bulk-restore', bulkRestoreProfiles);
// Parameterized routes come after specific routes
router.get('/profiles/:id', getProfileById);
router.put('/profiles/:id/approve', approveProfile);
router.put('/profiles/:id/reject', rejectProfile);
router.put('/profiles/:id/update', updateProfileField);
router.put('/profiles/:id/restore', restoreProfile);
router.delete('/profiles/:id/photos/:photoId', deleteProfilePhoto);
router.put('/users/bulk-block', bulkBlockUsers);
router.delete('/users/bulk-delete', bulkDeleteUsers);

export default router;

