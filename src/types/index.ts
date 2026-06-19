export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  safetyThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export type StockWarningStatus = 'normal' | 'warning';

export interface ProductWithWarning extends Product {
  warningStatus: StockWarningStatus;
  stockQuantity: number;
}

export type StockChangeType = 'in' | 'out';

export interface StockChange {
  id: string;
  productId: string;
  quantity: number;
  type: StockChangeType;
  timestamp: string;
  remark?: string;
}

export interface CreateProductDTO {
  sku: string;
  name: string;
  category: string;
  price: number;
  safetyThreshold?: number;
}

export interface UpdateProductDTO {
  sku?: string;
  name?: string;
  category?: string;
  price?: number;
  safetyThreshold?: number;
}

export interface SetSafetyThresholdDTO {
  safetyThreshold: number;
}

export interface StockOperationDTO {
  quantity: number;
  remark?: string;
}

export type StocktakeStatus = 'in_progress' | 'completed' | 'cancelled';

export interface StocktakeItem {
  productId: string;
  sku: string;
  name: string;
  category: string;
  bookQuantity: number;
  actualQuantity: number;
  difference: number;
}

export interface Stocktake {
  id: string;
  category: string;
  status: StocktakeStatus;
  items: StocktakeItem[];
  totalItems: number;
  totalBookQuantity: number;
  totalActualQuantity: number;
  totalDifference: number;
  remark?: string;
  createdAt: string;
  completedAt?: string;
  cancelledAt?: string;
}

export interface CreateStocktakeDTO {
  category: string;
  remark?: string;
}

export interface StocktakeCompletionDTO {
  remark?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: number;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

export interface ApiBusinessErrorResponse {
  success: false;
  error: {
    code: number;
    bizCode: number;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse | ApiBusinessErrorResponse;
