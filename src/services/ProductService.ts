import { store } from '../store';
import {
  Product,
  ProductWithWarning,
  CreateProductDTO,
  UpdateProductDTO,
} from '../types';
import { generateId } from '../utils/id';
import { nowTimestamp } from '../utils/time';
import { BusinessError } from '../errors/BusinessError';

function assertCategoryUnlocked(category: string, action: string): void {
  if (store.isCategoryLocked(category)) {
    const stocktakeId = store.getLockingStocktakeId(category);
    throw BusinessError.categoryLocked(category, stocktakeId!, action);
  }
}

export class ProductService {
  async createProduct(dto: CreateProductDTO): Promise<ProductWithWarning> {
    const { sku, name, category, price, safetyThreshold } = dto;

    if (store.existsBySku(sku)) {
      throw BusinessError.skuDuplicate(sku);
    }

    assertCategoryUnlocked(category, 'create product');

    const now = nowTimestamp();
    const product: Product = {
      id: generateId(),
      sku: sku.trim(),
      name: name.trim(),
      category: category.trim(),
      price,
      safetyThreshold: safetyThreshold ?? 0,
      createdAt: now,
      updatedAt: now,
    };

    store.addProduct(product);
    return store.enrichProductWithWarning(product);
  }

  async getProducts(
    filters?: { category?: string; name?: string; warning?: string },
  ): Promise<ProductWithWarning[]> {
    let products = store.getAllProductsWithWarning();

    if (filters?.category !== undefined && filters.category.trim().length > 0) {
      const target = filters.category.trim().toLowerCase();
      products = products.filter(
        p => p.category.toLowerCase() === target,
      );
    }

    if (filters?.name !== undefined && filters.name.trim().length > 0) {
      const keyword = filters.name.trim().toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(keyword));
    }

    if (filters?.warning !== undefined) {
      const w = filters.warning;
      if (w === 'true' || w === '1' || w.toLowerCase() === 'warning') {
        products = products.filter(p => p.warningStatus === 'warning');
      } else if (w === 'false' || w === '0' || w.toLowerCase() === 'normal') {
        products = products.filter(p => p.warningStatus === 'normal');
      }
    }

    return products;
  }

  async getProductById(id: string): Promise<ProductWithWarning> {
    const product = store.getProductById(id);
    if (!product) {
      throw BusinessError.productNotFound(id);
    }
    return store.enrichProductWithWarning(product);
  }

  async getWarningProducts(): Promise<{ count: number; products: ProductWithWarning[] }> {
    const products = store.getWarningProducts();
    return { count: products.length, products };
  }

  async updateProduct(
    id: string,
    dto: UpdateProductDTO,
  ): Promise<ProductWithWarning> {
    const existing = store.getProductById(id);
    if (!existing) {
      throw BusinessError.productNotFound(id);
    }

    if (dto.category && dto.category.trim() !== existing.category) {
      assertCategoryUnlocked(existing.category, 'change product category');
      assertCategoryUnlocked(dto.category, 'move product into category');
    } else {
      assertCategoryUnlocked(existing.category, 'update product');
    }

    if (dto.sku && dto.sku.trim() !== existing.sku && store.existsBySku(dto.sku, id)) {
      throw BusinessError.skuDuplicate(dto.sku);
    }

    const updated: Product = {
      ...existing,
      ...(dto.sku !== undefined && { sku: dto.sku.trim() }),
      ...(dto.name !== undefined && { name: dto.name.trim() }),
      ...(dto.category !== undefined && { category: dto.category.trim() }),
      ...(dto.price !== undefined && { price: dto.price }),
      ...(dto.safetyThreshold !== undefined && { safetyThreshold: dto.safetyThreshold }),
      updatedAt: nowTimestamp(),
    };

    store.updateProduct(id, updated);
    return store.enrichProductWithWarning(updated);
  }

  async setSafetyThreshold(
    id: string,
    safetyThreshold: number,
  ): Promise<ProductWithWarning> {
    const existing = store.getProductById(id);
    if (!existing) {
      throw BusinessError.productNotFound(id);
    }

    assertCategoryUnlocked(existing.category, 'update safety threshold');

    const updated: Product = {
      ...existing,
      safetyThreshold,
      updatedAt: nowTimestamp(),
    };

    store.updateProduct(id, updated);
    return store.enrichProductWithWarning(updated);
  }

  async deleteProduct(id: string): Promise<{ message: string }> {
    const existing = store.getProductById(id);
    if (!existing) {
      throw BusinessError.productNotFound(id);
    }

    assertCategoryUnlocked(existing.category, 'delete product');

    store.deleteProduct(id);
    return { message: 'Product deleted successfully' };
  }
}

export const productService = new ProductService();
