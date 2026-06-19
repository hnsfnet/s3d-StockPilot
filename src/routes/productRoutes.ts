import { Router } from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from '../controllers/productController';
import { validateCreateProduct, validateUpdateProduct } from '../middleware/validate';

const router = Router();

router.post('/', validateCreateProduct, createProduct);
router.get('/', getProducts);
router.get('/:id', getProductById);
router.put('/:id', validateUpdateProduct, updateProduct);
router.delete('/:id', deleteProduct);

export { router as productRouter };
