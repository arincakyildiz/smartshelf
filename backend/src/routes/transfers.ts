import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { createTransfer, listTransfers, updateTransfer } from '../controllers/transferController';

const router = Router();

router.use(authenticate);
router.get('/', listTransfers);
router.post('/', createTransfer);
router.patch('/:id', requireRole('admin'), updateTransfer);   // sadece admin onay/red/tamamlama

export default router;
