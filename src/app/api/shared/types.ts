/**
 * Shared types for the API layer
 */

export interface RequestContext {
  userId: string | null;
  userRole?: string | null;
  ip?: string;
  userAgent?: string;
  traceId?: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CRUDFilters {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface EntityMetadata {
  id: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type EntityWithMetadata<T> = T & EntityMetadata;