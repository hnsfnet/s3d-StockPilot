import { Request, Response, NextFunction } from 'express';
import { store } from '../store';
import { success } from '../utils/response';
import { generateId } from '../utils/id';
import { AppError } from '../middleware/errorHandler';
import { StockOperationDTO } from '../types';

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
    success(res, { productId, quantity });
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

    const current = store.getStock(productId) ?? 0;
    const newQuantity = current + quantity;
    store.setStock(productId, newQuantity);

    const change = {
      id: generateId(),
      productId,
      quantity,
      type: 'in' as const,
      timestamp: new Date().toISOString(),
      remark,
    };
    store.addStockChange(change);

    success(res, { productId, quantity: newQuantity, change }, 201);
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

    const current = store.getStock(productId) ?? 0;
    if (quantity > current) {
      throw new AppError(
        `Insufficient stock. Current: ${current}, requested: ${quantity}`,
        400,
      );
    }

    const newQuantity = current - quantity;
    store.setStock(productId, newQuantity);

    const change = {
      id: generateId(),
      productId,
      quantity,
      type: 'out' as const,
      timestamp: new Date().toISOString(),
      remark,
    };
    store.addStockChange(change);

    success(res, { productId, quantity: newQuantity, change }, 201);
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
