'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { RatingSummary, Review } from '@/schemas/review.schema';

export interface ReviewListParams {
  page?: number;
  limit?: number;
  rating?: number;
  sort?: 'newest' | 'rating_desc' | 'rating_asc';
}

export function useProductReviews(productId: string, params: ReviewListParams = {}) {
  return useQuery({
    queryKey: ['reviews', productId, params],
    queryFn: () =>
      api.getFull<Review[]>(`/products/${productId}/reviews`, {
        limit: 5,
        ...params,
      }),
    enabled: !!productId,
  });
}

export function useRatingSummary(productId: string) {
  return useQuery({
    queryKey: ['reviews', productId, 'summary'],
    queryFn: () => api.get<RatingSummary>(`/products/${productId}/reviews/summary`),
    enabled: !!productId,
  });
}

/** The signed-in customer's own review — drives edit vs. create. */
export function useMyReview(productId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['reviews', productId, 'mine'],
    queryFn: () => api.get<Review | null>(`/products/${productId}/reviews/mine`),
    enabled: enabled && !!productId,
  });
}

/** Both the review list and the product's aggregate change on write. */
function useReviewInvalidation(productId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['reviews', productId] });
    void qc.invalidateQueries({ queryKey: ['product'] });
    void qc.invalidateQueries({ queryKey: ['storefront-products'] });
  };
}

export function useCreateReview(productId: string) {
  const invalidate = useReviewInvalidation(productId);
  return useMutation({
    mutationFn: (payload: { rating: number; title?: string; body?: string }) =>
      api.post<Review>(`/products/${productId}/reviews`, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateReview(productId: string) {
  const invalidate = useReviewInvalidation(productId);
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { rating?: number; title?: string; body?: string };
    }) => api.patch<Review>(`/reviews/${id}`, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteReview(productId: string) {
  const invalidate = useReviewInvalidation(productId);
  return useMutation({
    mutationFn: (id: string) => api.del<{ deleted: boolean }>(`/reviews/${id}`),
    onSuccess: invalidate,
  });
}
