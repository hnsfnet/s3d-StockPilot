import { Request, Response, NextFunction } from 'express';
import { store } from '../store';
import { success } from '../utils/response';
import { generateId } from '../utils/id';
import { AppError } from '../middleware/errorHandler';
import { CreateProductDTO, UpdateProductDTO } from '../types';

export async function createProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sku, name, category, price } = req.body as CreateProductDTO;

    if (store.existsBySku(sku)) {
      throw new AppError(`Product with SKU "${sku}" already exists`, 409);
    }

    const now = new Date().toISOString();
    const product = {
      id: generateId(),
      sku: sku.trim(),
      name: name.trim(),
      category: category.trim(),
      price,
      createdAt: now,
      updatedAt: now,
    };

    store.addProduct(product);
    success(res, product, 201);
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
    const { category, name } = req.query;
    let products = store.getAllProducts();

    if (typeof category === 'string' && category.trim().length > 0) {
      const categoryFilter = category.trim();
      products = products.filter(p =>
        p.category.toLowerCase() === categoryFilter.toLowerCase(),
      );
    }

    if (typeof name === 'string' && name.trim().length > 0) {
      const nameKeyword = name.trim().toLowerCase();
      products = products.filter(p => p.name.toLowerCase().includes(nameKeyword));
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

    success(res, product);
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

    if (body.sku && body.sku.trim() !== existing.sku && store.existsBySku(body.sku, id)) {
      throw new AppError(`Product with SKU "${body.sku}" already exists`, 409);
    }

    const updated = {
      ...existing,
      ...(body.sku !== undefined && { sku: body.sku.trim() }),
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(body.category !== undefined && { category: body.category.trim() }),
      ...(body.price !== undefined && { price: body.price }),
      updatedAt: new Date().toISOString(),
    };

    store.updateProduct(id, updated);
    success(res, updated);
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
    const deleted = store.deleteProduct(id);

    if (!deleted) {
      throw new AppError(`Product with id "${id}" not found`, 404);
    }

    success(res, { message: 'Product deleted successfully' });
  } catch (err) {
    next(err);
  }
}
