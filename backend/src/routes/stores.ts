import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import {
  getStores, getStore, createStore, updateStore, deleteStore,
} from '../controllers/storeController';

const router = Router();

router.use(authenticate);
router.get('/', getStores);
router.get('/:id', getStore);
router.post('/',     requireRole('admin'), createStore);
router.put('/:id',   requireRole('admin'), updateStore);
router.delete('/:id',requireRole('admin'), deleteStore);

export default router;
