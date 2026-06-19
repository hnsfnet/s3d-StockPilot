import { Request, Response, NextFunction } from 'express';
import { store } from '../store';
import { success } from '../utils/response';
import { generateId } from '../utils/id';
import { nowTimestamp } from '../utils/time';
import { AppError } from '../middleware/errorHandler';
import {
  CreateStocktakeDTO,
  Stocktake,
  StocktakeItem,
  StocktakeCompletionDTO,
  StocktakeStatus,
} from '../types';

function buildStocktakeItems(category: string): StocktakeItem[] {
  const products = store.getProductsByCategory(category);
  return products.map(product => {
    const bookQuantity = store.getStock(product.id) ?? 0;
    const actualQuantity = bookQuantity;
    return {
      productId: product.id,
      sku: product.sku,
      name: product.name,
      category: product.category,
      bookQuantity,
      actualQuantity,
      difference: actualQuantity - bookQuantity,
    };
  });
}

function summarizeStocktake(items: StocktakeItem[]) {
  const totalItems = items.length;
  const totalBookQuantity = items.reduce((s, i) => s + i.bookQuantity, 0);
  const totalActualQuantity = items.reduce((s, i) => s + i.actualQuantity, 0);
  return {
    totalItems,
    totalBookQuantity,
    totalActualQuantity,
    totalDifference: totalActualQuantity - totalBookQuantity,
  };
}

export async function createStocktake(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { category, remark } = req.body as CreateStocktakeDTO;
    const trimmedCategory = category.trim();

    if (store.isCategoryLocked(trimmedCategory)) {
      const stocktakeId = store.getLockingStocktakeId(trimmedCategory);
      throw new AppError(
        `Category "${trimmedCategory}" is already locked by stocktake ${stocktakeId}`,
        409,
        { stocktakeId, category: trimmedCategory },
      );
    }

    const existingActive = store.getActiveStocktakeByCategory(trimmedCategory);
    if (existingActive) {
      throw new AppError(
        `An active stocktake for category "${trimmedCategory}" already exists: ${existingActive.id}`,
        409,
        { stocktakeId: existingActive.id, category: trimmedCategory },
      );
    }

    const items = buildStocktakeItems(trimmedCategory);
    const summary = summarizeStocktake(items);
    const now = nowTimestamp();

    const stocktakeId = generateId();
    const stocktake: Stocktake = {
      id: stocktakeId,
      category: trimmedCategory,
      status: 'in_progress',
      items,
      ...summary,
      remark,
      createdAt: now,
    };

    store.lockCategory(trimmedCategory, stocktakeId);
    store.addStocktake(stocktake);

    success(res, stocktake, 201);
  } catch (err) {
    next(err);
  }
}

export async function getStocktakes(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { category, status } = req.query;
    let stocktakes = store.getAllStocktakes();

    if (typeof category === 'string' && category.trim().length > 0) {
      const target = category.trim().toLowerCase();
      stocktakes = stocktakes.filter(
        s => s.category.toLowerCase() === target,
      );
    }

    if (typeof status === 'string' && status.trim().length > 0) {
      const target = status.trim() as StocktakeStatus;
      if (target === 'in_progress' || target === 'completed' || target === 'cancelled') {
        stocktakes = stocktakes.filter(s => s.status === target);
      }
    }

    success(res, stocktakes);
  } catch (err) {
    next(err);
  }
}

export async function getStocktakeById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const stocktake = store.getStocktakeById(id);

    if (!stocktake) {
      throw new AppError(`Stocktake with id "${id}" not found`, 404);
    }

    success(res, stocktake);
  } catch (err) {
    next(err);
  }
}

export async function completeStocktake(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const { remark } = req.body as StocktakeCompletionDTO;
    const stocktake = store.getStocktakeById(id);

    if (!stocktake) {
      throw new AppError(`Stocktake with id "${id}" not found`, 404);
    }

    if (stocktake.status !== 'in_progress') {
      throw new AppError(
        `Stocktake is already ${stocktake.status} and cannot be completed`,
        409,
        { status: stocktake.status },
      );
    }

    const completed: Stocktake = {
      ...stocktake,
      status: 'completed',
      remark: remark ?? stocktake.remark,
      completedAt: nowTimestamp(),
    };

    store.unlockCategory(stocktake.category);
    store.updateStocktake(id, completed);

    success(res, completed);
  } catch (err) {
    next(err);
  }
}

export async function cancelStocktake(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const { remark } = req.body as StocktakeCompletionDTO;
    const stocktake = store.getStocktakeById(id);

    if (!stocktake) {
      throw new AppError(`Stocktake with id "${id}" not found`, 404);
    }

    if (stocktake.status !== 'in_progress') {
      throw new AppError(
        `Stocktake is already ${stocktake.status} and cannot be cancelled`,
        409,
        { status: stocktake.status },
      );
    }

    const cancelled: Stocktake = {
      ...stocktake,
      status: 'cancelled',
      remark: remark ?? stocktake.remark,
      cancelledAt: nowTimestamp(),
    };

    store.unlockCategory(stocktake.category);
    store.updateStocktake(id, cancelled);

    success(res, cancelled);
  } catch (err) {
    next(err);
  }
}

export async function refreshStocktake(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const stocktake = store.getStocktakeById(id);

    if (!stocktake) {
      throw new AppError(`Stocktake with id "${id}" not found`, 404);
    }

    if (stocktake.status !== 'in_progress') {
      throw new AppError(
        `Only in_progress stocktake can be refreshed (current: ${stocktake.status})`,
        409,
        { status: stocktake.status },
      );
    }

    const items = buildStocktakeItems(stocktake.category);
    const summary = summarizeStocktake(items);

    const refreshed: Stocktake = {
      ...stocktake,
      items,
      ...summary,
    };

    store.updateStocktake(id, refreshed);
    success(res, refreshed);
  } catch (err) {
    next(err);
  }
}
