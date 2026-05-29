import { Router } from 'express';
import { login, me, register } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/login', asyncHandler(login));
router.post('/register', authenticate, requireRole('admin'), asyncHandler(register));  // sadece admin kullanıcı ekler
router.get('/me', authenticate, asyncHandler(me));

export default router;
