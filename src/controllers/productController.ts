import { Request, Response, NextFunction } from 'express';
import { productService } from '../services/ProductService';
import { success } from '../utils/response';

export async function createProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await productService.createProduct(req.body);
    success(res, result, 201);
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
    const result = await productService.getProducts({
      category: category as string | undefined,
      name: name as string | undefined,
      warning: warning as string | undefined,
    });
    success(res, result);
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
    const result = await productService.getProductById(req.params.id);
    success(res, result);
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
    const result = await productService.getWarningProducts();
    success(res, result);
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
    const result = await productService.updateProduct(req.params.id, req.body);
    success(res, result);
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
    const result = await productService.setSafetyThreshold(
      req.params.id,
      req.body.safetyThreshold,
    );
    success(res, result);
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
    const result = await productService.deleteProduct(req.params.id);
    success(res, result);
  } catch (err) {
    next(err);
  }
}
