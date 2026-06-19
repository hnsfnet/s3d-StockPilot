import { Router } from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getWarningProducts,
  setSafetyThreshold,
} from '../controllers/productController';
import {
  validateCreateProduct,
  validateUpdateProduct,
  validateSetSafetyThreshold,
} from '../middleware/validate';

const router = Router();

router.post('/', validateCreateProduct, createProduct);
router.get('/', getProducts);
router.get('/warnings', getWarningProducts);
router.get('/:id', getProductById);
router.put('/:id', validateUpdateProduct, updateProduct);
router.patch('/:id/safety-threshold', validateSetSafetyThreshold, setSafetyThreshold);
router.delete('/:id', deleteProduct);

export { router as productRouter };
