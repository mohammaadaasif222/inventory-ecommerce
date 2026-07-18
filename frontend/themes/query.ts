/**
 * Route search params → the `ListingQuery` themes receive.
 *
 * Lives in core rather than in a theme: every theme's listing needs the same
 * state, and parsing it five different ways would be five different sets of
 * bugs. A theme decides how filters *look*; core decides what they *mean*.
 */

import type { ListingQuery } from './contract';
import type { ProductSort } from '@/hooks/use-storefront';

/** What Next hands a page as `searchParams`. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

const SORTS: ProductSort[] = [
  'newest',
  'price_asc',
  'price_desc',
  'rating_desc',
  'name_asc',
];

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Parse a number, dropping anything that is not a finite non-negative one.
 *
 * A garbage `?minPrice=abc` must not become `NaN` in an API query — the backend
 * would either error or silently ignore it, and both are worse than the filter
 * simply not applying.
 */
function num(value: string | string[] | undefined): number | undefined {
  const raw = first(value);
  if (raw === undefined || raw === '') return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function parseListingQuery(params: RawSearchParams): ListingQuery {
  const sort = first(params.sort);
  const page = num(params.page);

  return {
    categoryId: first(params.categoryId),
    brandId: first(params.brandId),
    minPrice: num(params.minPrice),
    maxPrice: num(params.maxPrice),
    minRating: num(params.minRating),
    sort: SORTS.includes(sort as ProductSort) ? (sort as ProductSort) : undefined,
    // Pages are 1-based; a `?page=0` would ask the API for a page that does not
    // exist, so clamp rather than trust.
    page: page && page >= 1 ? Math.floor(page) : 1,
  };
}

export function parseSearchTerm(params: RawSearchParams): string {
  return first(params.q)?.trim() ?? '';
}
