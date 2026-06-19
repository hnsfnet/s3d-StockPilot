import { Request, Response, NextFunction } from 'express';
import { inventoryService } from '../services/InventoryService';
import { success } from '../utils/response';

export async function getStock(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await inventoryService.getStock(req.params.productId);
    success(res, result);
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
    const { quantity, remark } = req.body;
    const result = await inventoryService.stockIn(
      req.params.productId,
      quantity,
      remark,
    );
    success(res, result, 201);
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
    const { quantity, remark } = req.body;
    const result = await inventoryService.stockOut(
      req.params.productId,
      quantity,
      remark,
    );
    success(res, result, 201);
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
    const result = await inventoryService.getStockChanges(req.params.productId);
    success(res, result);
  } catch (err) {
    next(err);
  }
}
