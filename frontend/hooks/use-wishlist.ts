'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import type { Product } from '@/schemas/product.schema';

const KEY = ['wishlist'];

/** Full products for the wishlist page. */
export function useWishlist() {
  const signedIn = useAuthStore((s) => !!s.user);
  return useQuery({
    queryKey: KEY,
    queryFn: () => api.get<Product[]>('/wishlist'),
    enabled: signedIn,
  });
}

/**
 * Just the ids — cheap enough to hold for the whole session so every card can
 * render its heart without a request per card.
 */
export function useWishlistIds() {
  const signedIn = useAuthStore((s) => !!s.user);
  return useQuery({
    queryKey: [...KEY, 'ids'],
    queryFn: () => api.get<string[]>('/wishlist/ids'),
    enabled: signedIn,
    staleTime: 60 * 1000,
  });
}

export function useToggleWishlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) =>
      api.post<{ inWishlist: boolean }>(`/wishlist/${productId}/toggle`),
    // Optimistic: the heart must feel instant.
    onMutate: async (productId) => {
      await qc.cancelQueries({ queryKey: [...KEY, 'ids'] });
      const previous = qc.getQueryData<string[]>([...KEY, 'ids']) ?? [];
      const next = previous.includes(productId)
        ? previous.filter((id) => id !== productId)
        : [...previous, productId];
      qc.setQueryData([...KEY, 'ids'], next);
      return { previous };
    },
    onError: (_err, _productId, ctx) => {
      if (ctx?.previous) qc.setQueryData([...KEY, 'ids'], ctx.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: KEY });
    },
  });
}
