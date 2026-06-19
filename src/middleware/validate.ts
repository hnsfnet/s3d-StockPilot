import { Request, Response, NextFunction } from 'express';
import { error } from '../utils/response';

export function validateCreateProduct(req: Request, res: Response, next: NextFunction): void {
  const { sku, name, category, price, safetyThreshold } = req.body;
  const errors: string[] = [];

  if (!sku || typeof sku !== 'string' || sku.trim().length === 0) {
    errors.push('sku is required and must be a non-empty string');
  }
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push('name is required and must be a non-empty string');
  }
  if (!category || typeof category !== 'string' || category.trim().length === 0) {
    errors.push('category is required and must be a non-empty string');
  }
  if (price === undefined || typeof price !== 'number' || price < 0) {
    errors.push('price is required and must be a non-negative number');
  }
  if (safetyThreshold !== undefined) {
    if (!Number.isInteger(safetyThreshold) || safetyThreshold < 0) {
      errors.push('safetyThreshold must be a non-negative integer');
    }
  }

  if (errors.length > 0) {
    error(res, 'Validation failed', 400, errors);
    return;
  }

  next();
}

export function validateUpdateProduct(req: Request, res: Response, next: NextFunction): void {
  const { sku, name, category, price, safetyThreshold } = req.body;
  const errors: string[] = [];

  if (sku !== undefined && (typeof sku !== 'string' || sku.trim().length === 0)) {
    errors.push('sku must be a non-empty string');
  }
  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    errors.push('name must be a non-empty string');
  }
  if (category !== undefined && (typeof category !== 'string' || category.trim().length === 0)) {
    errors.push('category must be a non-empty string');
  }
  if (price !== undefined && (typeof price !== 'number' || price < 0)) {
    errors.push('price must be a non-negative number');
  }
  if (safetyThreshold !== undefined) {
    if (!Number.isInteger(safetyThreshold) || safetyThreshold < 0) {
      errors.push('safetyThreshold must be a non-negative integer');
    }
  }

  if (errors.length > 0) {
    error(res, 'Validation failed', 400, errors);
    return;
  }

  next();
}

export function validateSetSafetyThreshold(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const { safetyThreshold } = req.body;
  const errors: string[] = [];

  if (safetyThreshold === undefined || !Number.isInteger(safetyThreshold) || safetyThreshold < 0) {
    errors.push('safetyThreshold is required and must be a non-negative integer');
  }

  if (errors.length > 0) {
    error(res, 'Validation failed', 400, errors);
    return;
  }

  next();
}

export function validateStockOperation(req: Request, res: Response, next: NextFunction): void {
  const { quantity, remark } = req.body;
  const errors: string[] = [];

  if (quantity === undefined || !Number.isInteger(quantity) || quantity <= 0) {
    errors.push('quantity is required and must be a positive integer');
  }
  if (remark !== undefined && typeof remark !== 'string') {
    errors.push('remark must be a string');
  }

  if (errors.length > 0) {
    error(res, 'Validation failed', 400, errors);
    return;
  }

  next();
}

export function validateCreateStocktake(req: Request, res: Response, next: NextFunction): void {
  const { category, remark } = req.body;
  const errors: string[] = [];

  if (!category || typeof category !== 'string' || category.trim().length === 0) {
    errors.push('category is required and must be a non-empty string');
  }
  if (remark !== undefined && typeof remark !== 'string') {
    errors.push('remark must be a string');
  }

  if (errors.length > 0) {
    error(res, 'Validation failed', 400, errors);
    return;
  }

  next();
}

export function validateStocktakeAction(req: Request, res: Response, next: NextFunction): void {
  const { remark } = req.body;
  const errors: string[] = [];

  if (remark !== undefined && typeof remark !== 'string') {
    errors.push('remark must be a string');
  }

  if (errors.length > 0) {
    error(res, 'Validation failed', 400, errors);
    return;
  }

  next();
}
