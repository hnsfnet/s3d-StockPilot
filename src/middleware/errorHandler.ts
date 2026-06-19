import { Request, Response, NextFunction } from 'express';
import { error } from '../utils/response';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError('Resource not found', 404));
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    error(res, err.message, err.statusCode, err.details);
    return;
  }

  if (err.name === 'SyntaxError') {
    error(res, 'Invalid JSON payload', 400);
    return;
  }

  error(res, 'Internal server error', 500);
}
