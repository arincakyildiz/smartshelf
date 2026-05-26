import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getProducts, getProduct, createProduct, updateProduct, deleteProduct
} from '../controllers/productController';

const router = Router();

router.use(authenticate);
router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;
