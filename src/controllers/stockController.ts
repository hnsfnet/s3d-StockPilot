import { Request, Response, NextFunction } from 'express';
import { store } from '../store';
import { success } from '../utils/response';
import { AppError } from '../middleware/errorHandler';
import { StockOperationDTO } from '../types';

function assertCategoryUnlocked(category: string, action: string): void {
  if (store.isCategoryLocked(category)) {
    const stocktakeId = store.getLockingStocktakeId(category);
    throw new AppError(
      `Cannot ${action} stock: category "${category}" is locked by stocktake ${stocktakeId}`,
      409,
      { stocktakeId, category },
    );
  }
}

export async function getStock(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { productId } = req.params;

    const product = store.getProductById(productId);
    if (!product) {
      throw new AppError(`Product with id "${productId}" not found`, 404);
    }

    const quantity = store.getStock(productId) ?? 0;
    const warningStatus: 'normal' | 'warning' =
      quantity < product.safetyThreshold ? 'warning' : 'normal';

    success(res, {
      productId,
      quantity,
      safetyThreshold: product.safetyThreshold,
      warningStatus,
    });
  } catch (err) {
    next(err);
  }
}

export async function stockIn(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { productId } = req.params;
    const { quantity, remark } = req.body as StockOperationDTO;

    const product = store.getProductById(productId);
    if (!product) {
      throw new AppError(`Product with id "${productId}" not found`, 404);
    }

    assertCategoryUnlocked(product.category, 'perform stock-in for');

    const result = await store.adjustStock(productId, quantity, 'in', remark);

    const warningStatus: 'normal' | 'warning' =
      result.newQuantity < product.safetyThreshold ? 'warning' : 'normal';

    success(
      res,
      {
        productId,
        quantity: result.newQuantity,
        safetyThreshold: product.safetyThreshold,
        warningStatus,
        change: result.change,
      },
      201,
    );
  } catch (err) {
    next(err);
  }
}

export async function stockOut(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { productId } = req.params;
    const { quantity, remark } = req.body as StockOperationDTO;

    const product = store.getProductById(productId);
    if (!product) {
      throw new AppError(`Product with id "${productId}" not found`, 404);
    }

    assertCategoryUnlocked(product.category, 'perform stock-out for');

    let result;
    try {
      result = await store.adjustStock(productId, quantity, 'out', remark);
    } catch (err) {
      if (err instanceof Error && (err as Error & { code?: string }).code === 'INSUFFICIENT_STOCK') {
        const e = err as Error & { current?: number; requested?: number };
        throw new AppError(
          `Insufficient stock. Current: ${e.current ?? 0}, requested: ${e.requested ?? quantity}`,
          400,
          { current: e.current, requested: e.requested },
        );
      }
      throw err;
    }

    const warningStatus: 'normal' | 'warning' =
      result.newQuantity < product.safetyThreshold ? 'warning' : 'normal';

    success(
      res,
      {
        productId,
        quantity: result.newQuantity,
        safetyThreshold: product.safetyThreshold,
        warningStatus,
        change: result.change,
      },
      201,
    );
  } catch (err) {
    next(err);
  }
}

export async function getStockChanges(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { productId } = req.params;

    const product = store.getProductById(productId);
    if (!product) {
      throw new AppError(`Product with id "${productId}" not found`, 404);
    }

    const changes = store.getStockChangesByProductId(productId);
    success(res, changes);
  } catch (err) {
    next(err);
  }
}
