import { store } from '../../src/store';
import { productService } from '../../src/services/ProductService';
import { inventoryService } from '../../src/services/InventoryService';

export function resetStore(): void {
  store.reset();
}

export async function createTestProduct(
  overrides: Partial<{
    sku: string;
    name: string;
    category: string;
    price: number;
    safetyThreshold: number;
  }> = {},
) {
  return productService.createProduct({
    sku: overrides.sku ?? 'TEST-001',
    name: overrides.name ?? 'Test Product',
    category: overrides.category ?? 'Electronics',
    price: overrides.price ?? 99.99,
    safetyThreshold: overrides.safetyThreshold ?? 10,
  });
}

export async function stockInProduct(
  productId: string,
  quantity: number,
  remark?: string,
) {
  return inventoryService.stockIn(productId, quantity, remark);
}

export async function stockOutProduct(
  productId: string,
  quantity: number,
  remark?: string,
) {
  return inventoryService.stockOut(productId, quantity, remark);
}
