import { Router } from 'express';
import { login, me, register, signup, listStoresForSignup } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/login', asyncHandler(login));
router.post('/signup', asyncHandler(signup));            // herkese açık kayıt (store_manager)
router.get('/stores', asyncHandler(listStoresForSignup)); // kayıt formu için mağaza listesi
router.post('/register', authenticate, requireRole('admin'), asyncHandler(register));  // admin her rolü ekler
router.get('/me', authenticate, asyncHandler(me));

export default router;
