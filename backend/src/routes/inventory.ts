import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getInventory, updateInventory, getDashboardStats
} from '../controllers/inventoryController';

const router = Router();

router.use(authenticate);
router.get('/', getInventory);
router.get('/stats', getDashboardStats);
router.patch('/:store_id/:product_id', updateInventory);

export default router;
