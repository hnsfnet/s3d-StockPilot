import { Request, Response, NextFunction } from 'express';
import { store } from '../store';
import { success } from '../utils/response';
import { generateId } from '../utils/id';
import { AppError } from '../middleware/errorHandler';
import { CreateProductDTO, UpdateProductDTO, SetSafetyThresholdDTO } from '../types';

function assertCategoryUnlocked(category: string, action: string): void {
  if (store.isCategoryLocked(category)) {
    const stocktakeId = store.getLockingStocktakeId(category);
    throw new AppError(
      `Cannot ${action} product: category "${category}" is locked by stocktake ${stocktakeId}`,
      409,
      { stocktakeId, category },
    );
  }
}

export async function createProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sku, name, category, price, safetyThreshold } = req.body as CreateProductDTO;

    if (store.existsBySku(sku)) {
      throw new AppError(`Product with SKU "${sku}" already exists`, 409);
    }

    assertCategoryUnlocked(category, 'create');

    const now = new Date().toISOString();
    const product = {
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
    success(res, store.enrichProductWithWarning(product), 201);
  } catch (err) {
    next(err);
  }
}

export async function getProducts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { category, name, warning } = req.query;
    let products = store.getAllProductsWithWarning();

    if (typeof category === 'string' && category.trim().length > 0) {
      const categoryFilter = category.trim().toLowerCase();
      products = products.filter(p =>
        p.category.toLowerCase() === categoryFilter,
      );
    }

    if (typeof name === 'string' && name.trim().length > 0) {
      const nameKeyword = name.trim().toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(nameKeyword));
    }

    if (typeof warning === 'string') {
      if (warning === 'true' || warning === '1' || warning.toLowerCase() === 'warning') {
        products = products.filter(p => p.warningStatus === 'warning');
      } else if (warning === 'false' || warning === '0' || warning.toLowerCase() === 'normal') {
        products = products.filter(p => p.warningStatus === 'normal');
      }
    }

    success(res, products);
  } catch (err) {
    next(err);
  }
}

export async function getProductById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const product = store.getProductById(id);

    if (!product) {
      throw new AppError(`Product with id "${id}" not found`, 404);
    }

    success(res, store.enrichProductWithWarning(product));
  } catch (err) {
    next(err);
  }
}

export async function getWarningProducts(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const products = store.getWarningProducts();
    success(res, {
      count: products.length,
      products,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const body = req.body as UpdateProductDTO;
    const existing = store.getProductById(id);

    if (!existing) {
      throw new AppError(`Product with id "${id}" not found`, 404);
    }

    if (body.category && body.category.trim() !== existing.category) {
      assertCategoryUnlocked(existing.category, 'change category of');
      assertCategoryUnlocked(body.category, 'move product into');
    } else {
      assertCategoryUnlocked(existing.category, 'update');
    }

    if (body.sku && body.sku.trim() !== existing.sku && store.existsBySku(body.sku, id)) {
      throw new AppError(`Product with SKU "${body.sku}" already exists`, 409);
    }

    const updated = {
      ...existing,
      ...(body.sku !== undefined && { sku: body.sku.trim() }),
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.category !== undefined && { category: body.category.trim() }),
      ...(body.price !== undefined && { price: body.price }),
      ...(body.safetyThreshold !== undefined && { safetyThreshold: body.safetyThreshold }),
      updatedAt: new Date().toISOString(),
    };

    store.updateProduct(id, updated);
    success(res, store.enrichProductWithWarning(updated));
  } catch (err) {
    next(err);
  }
}

export async function setSafetyThreshold(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const { safetyThreshold } = req.body as SetSafetyThresholdDTO;
    const existing = store.getProductById(id);

    if (!existing) {
      throw new AppError(`Product with id "${id}" not found`, 404);
    }

    assertCategoryUnlocked(existing.category, 'update safety threshold of');

    const updated = {
      ...existing,
      safetyThreshold,
      updatedAt: new Date().toISOString(),
    };

    store.updateProduct(id, updated);
    success(res, store.enrichProductWithWarning(updated));
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const existing = store.getProductById(id);

    if (!existing) {
      throw new AppError(`Product with id "${id}" not found`, 404);
    }

    assertCategoryUnlocked(existing.category, 'delete');

    store.deleteProduct(id);
    success(res, { message: 'Product deleted successfully' });
  } catch (err) {
    next(err);
  }
}
