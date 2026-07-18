'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

/** Theme slugs a product is hidden in (visible everywhere else). */
export function useProductThemeVisibility(productId: string | null) {
  return useQuery({
    queryKey: ['theme-visibility', productId],
    queryFn: () =>
      api.get<{ hiddenThemes: string[] }>(`/products/${productId}/theme-visibility`),
    enabled: !!productId,
  });
}

export function useSaveProductThemeVisibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, hiddenThemes }: { productId: string; hiddenThemes: string[] }) =>
      api.put<{ hiddenThemes: string[] }>(`/products/${productId}/theme-visibility`, {
        hiddenThemes,
      }),
    onSuccess: (_d, { productId }) => {
      qc.invalidateQueries({ queryKey: ['theme-visibility', productId] });
      qc.invalidateQueries({ queryKey: ['storefront-products'] });
    },
  });
}

/**
 * The theme-switch migration: show or hide one category subtree's products
 * in a theme, in one call. Used by the activation dialog.
 */
export function useBulkThemeVisibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { themeSlug: string; categoryId: string; visible: boolean }) =>
      api.post<{ affected: number }>('/products/theme-visibility/bulk', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['storefront-products'] });
      qc.invalidateQueries({ queryKey: ['theme-visibility'] });
    },
  });
}
