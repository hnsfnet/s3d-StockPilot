import { store, StockAdjustmentResult } from '../store';
import { StockChange } from '../types';
import { BusinessError } from '../errors/BusinessError';

function assertCategoryUnlocked(category: string, action: string): void {
  if (store.isCategoryLocked(category)) {
    const stocktakeId = store.getLockingStocktakeId(category);
    throw BusinessError.categoryLocked(category, stocktakeId!, action);
  }
}

interface StockInfo {
  productId: string;
  quantity: number;
  safetyThreshold: number;
  warningStatus: 'normal' | 'warning';
}

interface StockOperationResult extends StockInfo {
  change: StockChange;
}

export class InventoryService {
  async getStock(productId: string): Promise<StockInfo> {
    const product = store.getProductById(productId);
    if (!product) {
      throw BusinessError.productNotFound(productId);
    }

    const quantity = store.getStock(productId) ?? 0;
    return {
      productId,
      quantity,
      safetyThreshold: product.safetyThreshold,
      warningStatus: quantity < product.safetyThreshold ? 'warning' : 'normal',
    };
  }

  async stockIn(
    productId: string,
    quantity: number,
    remark?: string,
  ): Promise<StockOperationResult> {
    const product = store.getProductById(productId);
    if (!product) {
      throw BusinessError.productNotFound(productId);
    }

    assertCategoryUnlocked(product.category, 'perform stock-in');

    let result: StockAdjustmentResult;
    try {
      result = await store.adjustStock(productId, quantity, 'in', remark);
    } catch (err) {
      if (err instanceof Error && (err as Error & { code?: string }).code === 'INSUFFICIENT_STOCK') {
        const e = err as Error & { current?: number; requested?: number };
        throw BusinessError.insufficientStock(e.current ?? 0, e.requested ?? quantity);
      }
      throw err;
    }

    return {
      productId,
      quantity: result.newQuantity,
      safetyThreshold: product.safetyThreshold,
      warningStatus: result.newQuantity < product.safetyThreshold ? 'warning' : 'normal',
      change: result.change,
    };
  }

  async stockOut(
    productId: string,
    quantity: number,
    remark?: string,
  ): Promise<StockOperationResult> {
    const product = store.getProductById(productId);
    if (!product) {
      throw BusinessError.productNotFound(productId);
    }

    assertCategoryUnlocked(product.category, 'perform stock-out');

    let result: StockAdjustmentResult;
    try {
      result = await store.adjustStock(productId, quantity, 'out', remark);
    } catch (err) {
      if (err instanceof Error && (err as Error & { code?: string }).code === 'INSUFFICIENT_STOCK') {
        const e = err as Error & { current?: number; requested?: number };
        throw BusinessError.insufficientStock(e.current ?? 0, e.requested ?? quantity);
      }
      throw err;
    }

    return {
      productId,
      quantity: result.newQuantity,
      safetyThreshold: product.safetyThreshold,
      warningStatus: result.newQuantity < product.safetyThreshold ? 'warning' : 'normal',
      change: result.change,
    };
  }

  async getStockChanges(productId: string): Promise<StockChange[]> {
    const product = store.getProductById(productId);
    if (!product) {
      throw BusinessError.productNotFound(productId);
    }

    return store.getStockChangesByProductId(productId);
  }
}

export const inventoryService = new InventoryService();
