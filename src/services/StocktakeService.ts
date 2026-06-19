import { store } from '../store';
import {
  Stocktake,
  StocktakeItem,
  StocktakeStatus,
  CreateStocktakeDTO,
  StocktakeCompletionDTO,
} from '../types';
import { generateId } from '../utils/id';
import { nowTimestamp } from '../utils/time';
import { BusinessError } from '../errors/BusinessError';

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

export class StocktakeService {
  async createStocktake(dto: CreateStocktakeDTO): Promise<Stocktake> {
    const trimmedCategory = dto.category.trim();

    if (store.isCategoryLocked(trimmedCategory)) {
      const stocktakeId = store.getLockingStocktakeId(trimmedCategory);
      throw BusinessError.categoryAlreadyLocked(trimmedCategory, stocktakeId!);
    }

    const existingActive = store.getActiveStocktakeByCategory(trimmedCategory);
    if (existingActive) {
      throw BusinessError.categoryActiveStocktake(trimmedCategory, existingActive.id);
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
      remark: dto.remark,
      createdAt: now,
    };

    store.lockCategory(trimmedCategory, stocktakeId);
    store.addStocktake(stocktake);

    return stocktake;
  }

  async getStocktakes(
    filters?: { category?: string; status?: string },
  ): Promise<Stocktake[]> {
    let stocktakes = store.getAllStocktakes();

    if (filters?.category && filters.category.trim().length > 0) {
      const target = filters.category.trim().toLowerCase();
      stocktakes = stocktakes.filter(
        s => s.category.toLowerCase() === target,
      );
    }

    if (filters?.status && filters.status.trim().length > 0) {
      const target = filters.status.trim() as StocktakeStatus;
      if (target === 'in_progress' || target === 'completed' || target === 'cancelled') {
        stocktakes = stocktakes.filter(s => s.status === target);
      }
    }

    return stocktakes;
  }

  async getStocktakeById(id: string): Promise<Stocktake> {
    const stocktake = store.getStocktakeById(id);
    if (!stocktake) {
      throw BusinessError.stocktakeNotFound(id);
    }
    return stocktake;
  }

  async completeStocktake(
    id: string,
    dto: StocktakeCompletionDTO,
  ): Promise<Stocktake> {
    const stocktake = store.getStocktakeById(id);
    if (!stocktake) {
      throw BusinessError.stocktakeNotFound(id);
    }

    if (stocktake.status !== 'in_progress') {
      throw BusinessError.stocktakeInvalidState(id, stocktake.status, 'in_progress');
    }

    const completed: Stocktake = {
      ...stocktake,
      status: 'completed',
      remark: dto.remark ?? stocktake.remark,
      completedAt: nowTimestamp(),
    };

    store.unlockCategory(stocktake.category);
    store.updateStocktake(id, completed);

    return completed;
  }

  async cancelStocktake(
    id: string,
    dto: StocktakeCompletionDTO,
  ): Promise<Stocktake> {
    const stocktake = store.getStocktakeById(id);
    if (!stocktake) {
      throw BusinessError.stocktakeNotFound(id);
    }

    if (stocktake.status !== 'in_progress') {
      throw BusinessError.stocktakeInvalidState(id, stocktake.status, 'in_progress');
    }

    const cancelled: Stocktake = {
      ...stocktake,
      status: 'cancelled',
      remark: dto.remark ?? stocktake.remark,
      cancelledAt: nowTimestamp(),
    };

    store.unlockCategory(stocktake.category);
    store.updateStocktake(id, cancelled);

    return cancelled;
  }

  async refreshStocktake(id: string): Promise<Stocktake> {
    const stocktake = store.getStocktakeById(id);
    if (!stocktake) {
      throw BusinessError.stocktakeNotFound(id);
    }

    if (stocktake.status !== 'in_progress') {
      throw BusinessError.stocktakeInvalidState(id, stocktake.status, 'in_progress');
    }

    const items = buildStocktakeItems(stocktake.category);
    const summary = summarizeStocktake(items);

    const refreshed: Stocktake = {
      ...stocktake,
      items,
      ...summary,
    };

    store.updateStocktake(id, refreshed);
    return refreshed;
  }
}

export const stocktakeService = new StocktakeService();
