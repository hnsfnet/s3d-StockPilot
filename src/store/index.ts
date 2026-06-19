import { Product, StockChange } from '../types';

class InMemoryStore {
  private products: Map<string, Product> = new Map();
  private stock: Map<string, number> = new Map();
  private stockChanges: StockChange[] = [];
  private skuIndex: Map<string, string> = new Map();

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
    return true;
  }

  getStock(productId: string): number | undefined {
    return this.stock.get(productId);
  }

  setStock(productId: string, quantity: number): void {
    this.stock.set(productId, quantity);
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
}

export const store = new InMemoryStore();
