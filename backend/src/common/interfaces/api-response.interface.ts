/**
 * Canonical envelope returned by every endpoint:
 *   { success, data, message, meta? }
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
  meta?: ResponseMeta;
}

export interface ResponseMeta {
  /** Offset pagination metadata (admin tables). */
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  /** Cursor pagination metadata (chat / logs). */
  nextCursor?: string | null;
  [key: string]: unknown;
}
