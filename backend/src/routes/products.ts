import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct, getCategories,
} from '../controllers/productController';

const router = Router();

router.use(authenticate);
router.get('/categories', getCategories);
router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/',     requireRole('admin'), createProduct);
router.put('/:id',   requireRole('admin'), updateProduct);
router.delete('/:id',requireRole('admin'), deleteProduct);

export default router;
