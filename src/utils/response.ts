import { Response } from 'express';
import { ApiResponse } from '../types';
import { nowTimestamp } from './time';

export function success<T>(res: Response, data: T, statusCode = 200): Response<ApiResponse<T>> {
  return res.status(statusCode).json({
    success: true,
    data,
    timestamp: nowTimestamp(),
  });
}

export function error(
  res: Response,
  message: string,
  statusCode = 500,
  details?: unknown,
): Response<ApiResponse<never>> {
  return res.status(statusCode).json({
    success: false,
    error: {
      code: statusCode,
      message,
      details,
    },
    timestamp: nowTimestamp(),
  });
}
