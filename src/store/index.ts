import { Product, StockChange, Stocktake, ProductWithWarning } from '../types';
import { nowTimestamp } from '../utils/time';
import { generateId } from '../utils/id';

export interface StockAdjustmentResult {
  previousQuantity: number;
  newQuantity: number;
  change: StockChange;
}

class InMemoryStore {
  private products: Map<string, Product> = new Map();
  private stock: Map<string, number> = new Map();
  private stockChanges: StockChange[] = [];
  private skuIndex: Map<string, string> = new Map();

  private stocktakes: Map<string, Stocktake> = new Map();
  private lockedCategories: Map<string, string> = new Map();

  private stockLocks: Map<string, Promise<void>> = new Map();

  private async acquireStockLock(productId: string): Promise<() => void> {
    const prev = this.stockLocks.get(productId) ?? Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>(resolve => {
      release = resolve;
    });
    this.stockLocks.set(productId, prev.then(() => next));
    await prev;
    return () => {
      release();
      if (this.stockLocks.get(productId) === next) {
        this.stockLocks.delete(productId);
      }
    };
  }

  addProduct(product: Product): void {
    this.products.set(product.id, product);
    this.skuIndex.set(product.sku, product.id);
    if (!this.stock.has(product.id)) {
      this.stock.set(product.id, 0);
    }
  }

  getProductById(id: string): Product | undefined {
    return this.products.get(id);
  }

  getProductBySku(sku: string): Product | undefined {
    const id = this.skuIndex.get(sku);
    return id ? this.products.get(id) : undefined;
  }

  getAllProducts(): Product[] {
    return Array.from(this.products.values());
  }

  getProductsByCategory(category: string): Product[] {
    const target = category.trim().toLowerCase();
    return this.getAllProducts().filter(
      p => p.category.toLowerCase() === target,
    );
  }

  enrichProductWithWarning(product: Product): ProductWithWarning {
    const quantity = this.getStock(product.id) ?? 0;
    return {
      ...product,
      stockQuantity: quantity,
      warningStatus: quantity < product.safetyThreshold ? 'warning' : 'normal',
    };
  }

  getAllProductsWithWarning(): ProductWithWarning[] {
    return this.getAllProducts().map(p => this.enrichProductWithWarning(p));
  }

  getWarningProducts(): ProductWithWarning[] {
    return this.getAllProductsWithWarning().filter(p => p.warningStatus === 'warning');
  }

  updateProduct(id: string, product: Product): void {
    const old = this.products.get(id);
    if (old && old.sku !== product.sku) {
      this.skuIndex.delete(old.sku);
      this.skuIndex.set(product.sku, id);
    }
    this.products.set(id, product);
  }

  deleteProduct(id: string): boolean {
    const product = this.products.get(id);
    if (!product) return false;
    this.products.delete(id);
    this.skuIndex.delete(product.sku);
    this.stock.delete(id);
    this.stockChanges = this.stockChanges.filter(c => c.productId !== id);
    this.stockLocks.delete(id);
    return true;
  }

  getStock(productId: string): number | undefined {
    return this.stock.get(productId);
  }

  setStock(productId: string, quantity: number): void {
    this.stock.set(productId, quantity);
  }

  private addStockChangeInternal(change: StockChange): void {
    this.stockChanges.push(change);
  }

  addStockChange(change: StockChange): void {
    this.stockChanges.push(change);
  }

  getStockChangesByProductId(productId: string): StockChange[] {
    return this.stockChanges
      .filter(c => c.productId === productId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  existsBySku(sku: string, excludeId?: string): boolean {
    const id = this.skuIndex.get(sku);
    if (!id) return false;
    return excludeId ? id !== excludeId : true;
  }

  isCategoryLocked(category: string): boolean {
    return this.lockedCategories.has(category.trim().toLowerCase());
  }

  getLockingStocktakeId(category: string): string | undefined {
    return this.lockedCategories.get(category.trim().toLowerCase());
  }

  lockCategory(category: string, stocktakeId: string): void {
    this.lockedCategories.set(category.trim().toLowerCase(), stocktakeId);
  }

  unlockCategory(category: string): void {
    this.lockedCategories.delete(category.trim().toLowerCase());
  }

  addStocktake(stocktake: Stocktake): void {
    this.stocktakes.set(stocktake.id, stocktake);
  }

  getStocktakeById(id: string): Stocktake | undefined {
    return this.stocktakes.get(id);
  }

  getAllStocktakes(): Stocktake[] {
    return Array.from(this.stocktakes.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  getStocktakesByCategory(category: string): Stocktake[] {
    const target = category.trim().toLowerCase();
    return this.getAllStocktakes().filter(
      s => s.category.toLowerCase() === target,
    );
  }

  getActiveStocktakeByCategory(category: string): Stocktake | undefined {
    const target = category.trim().toLowerCase();
    return this.getAllStocktakes().find(
      s => s.category.toLowerCase() === target && s.status === 'in_progress',
    );
  }

  updateStocktake(id: string, stocktake: Stocktake): void {
    this.stocktakes.set(id, stocktake);
  }

  async adjustStock(
    productId: string,
    delta: number,
    type: 'in' | 'out',
    remark?: string,
  ): Promise<StockAdjustmentResult> {
    if (!Number.isInteger(delta) || delta <= 0) {
      throw new Error('delta must be a positive integer');
    }

    const release = await this.acquireStockLock(productId);
    try {
      const previousQuantity = this.stock.get(productId) ?? 0;
      if (type === 'out' && delta > previousQuantity) {
        const error: Error & { code?: string; current?: number; requested?: number } = new Error(
          `Insufficient stock. Current: ${previousQuantity}, requested: ${delta}`,
        );
        error.code = 'INSUFFICIENT_STOCK';
        error.current = previousQuantity;
        error.requested = delta;
        throw error;
      }

      const newQuantity = type === 'in' ? previousQuantity + delta : previousQuantity - delta;
      this.stock.set(productId, newQuantity);

      const change: StockChange = {
        id: generateId(),
        productId,
        quantity: delta,
        type,
        timestamp: nowTimestamp(),
        remark,
      };
      this.addStockChangeInternal(change);

      return { previousQuantity, newQuantity, change };
    } finally {
      release();
    }
  }

  reset(): void {
    this.products.clear();
    this.stock.clear();
    this.stockChanges = [];
    this.skuIndex.clear();
    this.stocktakes.clear();
    this.lockedCategories.clear();
    this.stockLocks.clear();
  }
}

export const store = new InMemoryStore();
