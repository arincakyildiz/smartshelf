import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getInventory, updateInventory, getDashboardStats,
  getExcessStores, getProductsWithStock,
} from '../controllers/inventoryController';

const router = Router();

router.use(authenticate);
router.get('/', getInventory);
router.get('/stats', getDashboardStats);
router.get('/excess-stores', getExcessStores);
router.get('/products-with-stock', getProductsWithStock);
router.patch('/:store_id/:product_id', updateInventory);

export default router;
