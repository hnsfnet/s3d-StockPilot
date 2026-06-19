export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  createdAt: string;
  updatedAt: string;
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
}

export interface UpdateProductDTO {
  sku?: string;
  name?: string;
  category?: string;
  price?: number;
}

export interface StockOperationDTO {
  quantity: number;
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

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
