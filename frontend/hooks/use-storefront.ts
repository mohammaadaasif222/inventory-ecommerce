'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useTheme, useThemeSlugSafe } from '@/themes/runtime/theme-runtime';
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

/**
 * The active theme's homepage sections: its own plus the shared ones.
 *
 * Keyed by the slug actually rendering (not the DB-active theme), so an
 * admin previewing an inactive theme sees that theme's sections too.
 */
export function useHomepageSections() {
  const { slug } = useTheme();
  return useQuery({
    queryKey: ['homepage', slug],
    queryFn: () => api.get<HomepageSection[]>('/homepage', { theme: slug }),
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
  // Per-theme visibility: the rendered theme's slug rides every storefront
  // product query, so products hidden in this theme never surface. Null
  // outside the storefront (admin), which sees the full catalog.
  const themeSlug = useThemeSlugSafe();
  // Drop empty filters so the query key (and the URL) stay stable.
  const clean = Object.fromEntries(
    Object.entries({ ...params, theme: themeSlug ?? undefined }).filter(
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
  /** Admin-uploaded tile/lifestyle image; themes fall back to placeholders. */
  imageUrl?: string | null;
  children?: Category[];
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get<Category[]>('/catalog/categories'),
    staleTime: 5 * 60 * 1000,
  });
}

function findBySlug(nodes: Category[] | undefined, slug: string): Category | null {
  for (const node of nodes ?? []) {
    if (node.slug === slug) return node;
    const hit = findBySlug(node.children, slug);
    if (hit) return hit;
  }
  return null;
}

export interface CatalogScope {
  /** Category id to constrain product queries to, or undefined = whole catalog. */
  id?: string;
  /** The resolved scope category, when the theme declares one that exists. */
  category?: Category;
  /** Its children — a single-vertical theme's navigation entries. */
  children: Category[];
}

/**
 * The active theme's catalog scope, resolved against the live category tree.
 *
 * Single-vertical themes (perfume, home decor) declare `catalogScope` in their
 * config; this turns that slug into a category id the product queries filter
 * by (the backend includes descendants). A slug that matches nothing degrades
 * to unscoped — a mis-set scope should never blank the storefront.
 */
export function useCatalogScope(): CatalogScope {
  const { catalogScope } = useTheme();
  const { data: categories } = useCategories();

  if (!catalogScope) return { children: categories ?? [] };
  const category = findBySlug(categories, catalogScope);
  if (!category) return { children: categories ?? [] };
  return { id: category.id, category, children: category.children ?? [] };
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
