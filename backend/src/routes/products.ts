import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct, getCategories,
} from '../controllers/productController';

const router = Router();

router.use(authenticate);
router.get('/categories', asyncHandler(getCategories));
router.get('/', asyncHandler(getProducts));
router.get('/:id', asyncHandler(getProduct));
router.post('/',     requireRole('admin'), asyncHandler(createProduct));
router.put('/:id',   requireRole('admin'), asyncHandler(updateProduct));
router.delete('/:id',requireRole('admin'), asyncHandler(deleteProduct));

export default router;
