import { Request, Response, NextFunction } from 'express';
import { stocktakeService } from '../services/StocktakeService';
import { success } from '../utils/response';

export async function createStocktake(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await stocktakeService.createStocktake(req.body);
    success(res, result, 201);
  } catch (err) {
    next(err);
  }
}

export async function getStocktakes(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { category, status } = req.query;
    const result = await stocktakeService.getStocktakes({
      category: category as string | undefined,
      status: status as string | undefined,
    });
    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getStocktakeById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await stocktakeService.getStocktakeById(req.params.id);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function completeStocktake(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await stocktakeService.completeStocktake(req.params.id, req.body);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function cancelStocktake(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await stocktakeService.cancelStocktake(req.params.id, req.body);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function refreshStocktake(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await stocktakeService.refreshStocktake(req.params.id);
    success(res, result);
  } catch (err) {
    next(err);
  }
}
