import { Request, Response, NextFunction } from 'express';
import { BusinessError } from '../errors/BusinessError';
import { ErrorCodes } from '../errors/codes';
import { nowTimestamp } from '../utils/time';

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(
    new BusinessError('Resource not found', ErrorCodes.NOT_FOUND, 404),
  );
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const timestamp = nowTimestamp();

  if (err instanceof BusinessError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.statusCode,
        bizCode: err.code,
        message: err.message,
        details: err.details,
      },
      timestamp,
    });
    return;
  }

  if (err.name === 'SyntaxError') {
    res.status(400).json({
      success: false,
      error: {
        code: 400,
        bizCode: ErrorCodes.BAD_REQUEST,
        message: 'Invalid JSON payload',
      },
      timestamp,
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: {
      code: 500,
      bizCode: ErrorCodes.INTERNAL_ERROR,
      message: 'Internal server error',
    },
    timestamp,
  });
}
