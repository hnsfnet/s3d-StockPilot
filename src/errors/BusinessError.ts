import { ErrorCode, ErrorCodes } from './codes';

export class BusinessError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: ErrorCode = ErrorCodes.INTERNAL_ERROR,
    statusCode: number = 400,
    details?: unknown,
  ) {
    super(message);
    this.name = 'BusinessError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }

  static productNotFound(id: string): BusinessError {
    return new BusinessError(
      `Product with id "${id}" not found`,
      ErrorCodes.PRODUCT_NOT_FOUND,
      404,
      { id },
    );
  }

  static skuDuplicate(sku: string): BusinessError {
    return new BusinessError(
      `Product with SKU "${sku}" already exists`,
      ErrorCodes.PRODUCT_SKU_DUPLICATE,
      409,
      { sku },
    );
  }

  static insufficientStock(current: number, requested: number): BusinessError {
    return new BusinessError(
      `Insufficient stock. Current: ${current}, requested: ${requested}`,
      ErrorCodes.STOCK_INSUFFICIENT,
      400,
      { current, requested },
    );
  }

  static categoryLocked(category: string, stocktakeId: string, action: string): BusinessError {
    return new BusinessError(
      `Cannot ${action}: category "${category}" is locked by stocktake ${stocktakeId}`,
      ErrorCodes.STOCK_CATEGORY_LOCKED,
      409,
      { category, stocktakeId, action },
    );
  }

  static stocktakeNotFound(id: string): BusinessError {
    return new BusinessError(
      `Stocktake with id "${id}" not found`,
      ErrorCodes.STOCKTAKE_NOT_FOUND,
      404,
      { id },
    );
  }

  static stocktakeInvalidState(
    id: string,
    current: string,
    expected: string,
  ): BusinessError {
    return new BusinessError(
      `Stocktake ${id} is in state "${current}", expected "${expected}"`,
      ErrorCodes.STOCKTAKE_INVALID_STATE,
      409,
      { id, current, expected },
    );
  }

  static categoryAlreadyLocked(category: string, stocktakeId: string): BusinessError {
    return new BusinessError(
      `Category "${category}" is already locked by stocktake ${stocktakeId}`,
      ErrorCodes.STOCKTAKE_CATEGORY_LOCKED,
      409,
      { category, stocktakeId },
    );
  }

  static categoryActiveStocktake(category: string, stocktakeId: string): BusinessError {
    return new BusinessError(
      `An active stocktake for category "${category}" already exists: ${stocktakeId}`,
      ErrorCodes.STOCKTAKE_NO_ACTIVE,
      409,
      { category, stocktakeId },
    );
  }
}
