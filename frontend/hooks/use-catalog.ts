'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Category } from './use-storefront';

export interface CategoryBody {
  name?: string;
  description?: string;
  imageUrl?: string;
  parentId?: string;
  isActive?: boolean;
  sortOrder?: number;
}

/** Admin category CRUD — reads come from the shared `useCategories()` tree. */
export function useCategoryMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['categories'] });
  return {
    create: useMutation({
      mutationFn: (body: CategoryBody & { name: string }) =>
        api.post<Category>('/catalog/categories', body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: CategoryBody }) =>
        api.patch<Category>(`/catalog/categories/${id}`, body),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.del(`/catalog/categories/${id}`),
      onSuccess: invalidate,
    }),
  };
}
