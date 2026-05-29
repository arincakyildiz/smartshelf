import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getInventory, updateInventory, getDashboardStats,
  getExcessStores, getProductsWithStock, getInventoryHistory,
} from '../controllers/inventoryController';

const router = Router();

router.use(authenticate);
router.get('/', asyncHandler(getInventory));
router.get('/stats', asyncHandler(getDashboardStats));
router.get('/excess-stores', asyncHandler(getExcessStores));
router.get('/products-with-stock', asyncHandler(getProductsWithStock));
router.get('/history', asyncHandler(getInventoryHistory));
router.patch('/:store_id/:product_id', asyncHandler(updateInventory));

export default router;
