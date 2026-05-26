import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getStores, getStore, createStore, updateStore } from '../controllers/storeController';

const router = Router();

router.use(authenticate);
router.get('/', getStores);
router.get('/:id', getStore);
router.post('/', createStore);
router.put('/:id', updateStore);

export default router;
