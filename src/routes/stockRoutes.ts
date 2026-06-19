import { Router } from 'express';
import {
  getStock,
  stockIn,
  stockOut,
  getStockChanges,
} from '../controllers/stockController';
import { validateStockOperation } from '../middleware/validate';

const router = Router();

router.get('/:productId', getStock);
router.post('/:productId/in', validateStockOperation, stockIn);
router.post('/:productId/out', validateStockOperation, stockOut);
router.get('/:productId/changes', getStockChanges);

export { router as stockRouter };
