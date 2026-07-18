'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Product } from '@/schemas/product.schema';

export interface HomepageSection {
  _id: string;
  type: string;
  title: string;
  config: Record<string, unknown>;
}

export interface KbArticle {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  blocks?: { type: string; data: Record<string, unknown> }[];
  helpfulYes?: number;
  helpfulNo?: number;
  views?: number;
}

export function useHomepageSections() {
  return useQuery({
    queryKey: ['homepage'],
    queryFn: () => api.get<HomepageSection[]>('/homepage'),
  });
}

export type ProductSort =
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'rating_desc'
  | 'name_asc';

export interface StorefrontProductParams {
  page?: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: ProductSort;
}

export function useStorefrontProducts(params: StorefrontProductParams) {
  // Drop empty filters so the query key (and the URL) stay stable.
  const clean = Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== '',
    ),
  );
  return useQuery({
    queryKey: ['storefront-products', clean],
    queryFn: () =>
      api.getFull<Product[]>('/products', {
        ...clean,
        limit: 12,
        status: 'ACTIVE',
      }),
  });
}

/**
 * Related products: co-purchased first, topped up from the same category.
 * Public endpoint — works signed-out.
 */
export function useRelatedProducts(productId: string | undefined, limit = 8) {
  return useQuery({
    queryKey: ['related', productId, limit],
    queryFn: () =>
      api.get<Product[]>(`/recommendations/related/${productId}`, { limit }),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });
}

/** Fetch a specific set of products (homepage featured rails) in one request. */
export function useProductsByIds(ids: string[] | undefined) {
  return useQuery({
    queryKey: ['products-by-ids', ids],
    queryFn: () =>
      api.get<Product[]>('/products', {
        ids: (ids ?? []).join(','),
        status: 'ACTIVE',
        limit: 24,
      }),
    enabled: !!ids && ids.length > 0,
    staleTime: 60 * 1000,
  });
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  children?: Category[];
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/catalog/categories'),
    staleTime: 5 * 60 * 1000,
  });
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: () => api.get<Brand[]>('/catalog/brands'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProductBySlug(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.get<Product | null>(`/products/slug/${slug}`),
    enabled: !!slug,
  });
}

/**
 * `help` (default) is the support centre; `post` is the storefront journal.
 * Same collection server-side, disjoint surfaces — a support article never
 * appears on /blog and vice versa.
 */
export function useArticles(kind: 'help' | 'post' = 'help') {
  return useQuery({
    queryKey: ['kb-articles', kind],
    queryFn: () => api.get<KbArticle[]>('/knowledge-base/articles', { kind }),
  });
}

export function useArticle(slug: string) {
  return useQuery({
    queryKey: ['kb-article', slug],
    queryFn: () => api.get<KbArticle>(`/knowledge-base/articles/${slug}`),
    enabled: !!slug,
  });
}
