'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api, ApiMeta } from '@/lib/api-client';
import type { Product } from '@/schemas/product.schema';

const KEY = ['products'];

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: [...KEY, params],
    queryFn: () =>
      api.getFull<Product[]>('/products', params as Record<string, unknown>),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: unknown) => api.post<Product>('/products', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: unknown }) =>
      api.patch<Product>(`/products/${id}`, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export type { ApiMeta };
