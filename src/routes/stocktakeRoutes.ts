import { Router } from 'express';
import {
  createStocktake,
  getStocktakes,
  getStocktakeById,
  completeStocktake,
  cancelStocktake,
  refreshStocktake,
} from '../controllers/stocktakeController';
import { validateCreateStocktake, validateStocktakeAction } from '../middleware/validate';

const router = Router();

router.post('/', validateCreateStocktake, createStocktake);
router.get('/', getStocktakes);
router.get('/:id', getStocktakeById);
router.post('/:id/complete', validateStocktakeAction, completeStocktake);
router.post('/:id/cancel', validateStocktakeAction, cancelStocktake);
router.post('/:id/refresh', refreshStocktake);

export { router as stocktakeRouter };
