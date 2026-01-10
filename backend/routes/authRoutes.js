import express from 'express';
import { 
  register, 
  login, 
  getMe, 
  forgotPassword, 
  resetPassword,
  deactivateAccount,
  reactivateAccount,
  deleteAccount,
  updateContact,
  updatePrivacySettings,
  downloadUserData,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.put('/deactivate', protect, deactivateAccount);
router.put('/reactivate', protect, reactivateAccount);
router.delete('/delete', protect, deleteAccount);
router.put('/update-contact', protect, updateContact);
router.put('/privacy', protect, updatePrivacySettings);
router.get('/download-data', protect, downloadUserData);

export default router;

