import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getStores, getStore, createStore, updateStore, deleteStore, getCities,
} from '../controllers/storeController';

const router = Router();

router.use(authenticate);
router.get('/cities', asyncHandler(getCities));
router.get('/', asyncHandler(getStores));
router.get('/:id', asyncHandler(getStore));
router.post('/',     requireRole('admin'), asyncHandler(createStore));
router.put('/:id',   requireRole('admin'), asyncHandler(updateStore));
router.delete('/:id',requireRole('admin'), asyncHandler(deleteStore));

export default router;
