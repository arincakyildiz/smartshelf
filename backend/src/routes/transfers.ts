import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { asyncHandler } from '../utils/asyncHandler';
import { createTransfer, listTransfers, updateTransfer } from '../controllers/transferController';

const router = Router();

router.use(authenticate);
router.get('/', asyncHandler(listTransfers));
router.post('/', asyncHandler(createTransfer));
router.patch('/:id', requireRole('admin'), asyncHandler(updateTransfer));   // sadece admin onay/red/tamamlama

export default router;
