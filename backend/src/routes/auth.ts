import { Router } from 'express';
import { login, me, register } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();

router.post('/login', login);
router.post('/register', authenticate, requireRole('admin'), register);  // sadece admin kullanıcı ekler
router.get('/me', authenticate, me);

export default router;
