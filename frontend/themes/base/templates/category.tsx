'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LayoutGrid,
  Loader2,
  Rows3,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/ui/star-rating';
import { ProductCard, formatPrice } from '@/components/storefront/product-card';
import type { Product } from '@/schemas/product.schema';
import { Reveal, RevealGroup, RevealItem } from '@/components/storefront/motion';
import {
  ProductFilters,
  type ProductFilterValue,
} from '@/components/storefront/product-filters';
import { useLayout } from '@/themes/runtime/theme-runtime';
import {
  useCatalogScope,
  useStorefrontProducts,
  type ProductSort,
} from '@/hooks/use-storefront';
import { cn } from '@/lib/utils';
import type { CategoryTemplateProps } from '@/themes/contract';

const SORT_OPTIONS: { value: ProductSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating_desc', label: 'Top rated' },
  { value: 'name_asc', label: 'Name: A–Z' },
];

type ViewMode = 'grid' | 'list';

const VIEW_KEY = 'catalog-view';

/**
 * The visitor's grid/list preference, kept across visits.
 *
 * localStorage rather than the URL: a view mode is how *this person* likes to
 * scan a catalog, not part of the address of a result set — sharing a link
 * should share the products, not the sender's browsing habits.
 */
function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const [view, setView] = useState<ViewMode>('grid');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_KEY);
      if (saved === 'list') setView('list');
    } catch {
      // Blocked storage: grid default stands.
    }
  }, []);

  const update = (mode: ViewMode) => {
    setView(mode);
    try {
      window.localStorage.setItem(VIEW_KEY, mode);
    } catch {
      // Session-only preference is fine.
    }
  };

  return [view, update];
}

/**
 * Base category listing — filters, sort, grid, pagination.
 *
 * Every structural decision here reads from layout tokens rather than the
 * theme's identity: where the filters sit, how many columns, how dense. That is
 * what lets Maison, Noir and Botanica share this file and still look like three
 * different shops.
 */
export default function CategoryTemplate({ query }: CategoryTemplateProps) {
  const router = useRouter();
  const layout = useLayout();

  const [page, setPage] = useState(query.page);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState<ProductSort>(query.sort ?? 'newest');
  const [showFilters, setShowFilters] = useState(false);
  const [view, setView] = useViewMode();
  // Seeded from the route so homepage tiles ("?categoryId=…") land pre-filtered.
  const [filters, setFilters] = useState<ProductFilterValue>(() => ({
    categoryId: query.categoryId,
    brandId: query.brandId,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
    minRating: query.minRating,
  }));

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sort, filters]);

  // Single-vertical themes browse only their subtree; a user-chosen
  // subcategory (always inside the scope) wins over the scope root.
  const scope = useCatalogScope();

  const { data, isLoading, isFetching } = useStorefrontProducts({
    page,
    search: debouncedSearch || undefined,
    sort,
    ...filters,
    categoryId: filters.categoryId ?? scope.id,
  });

  const products = data?.data ?? [];
  const meta = data?.meta;

  const clearAll = () => {
    setFilters({});
    setSearch('');
    // Drop the query string too, or the URL would contradict the cleared state.
    router.replace('/products');
  };

  const isTopbar = layout.filters === 'topbar';
  const isDense = layout.density === 'dense';

  const results = (
    <div className="space-y-8">
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-display text-xl">Nothing matches those filters</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try widening your search.
          </p>
          <Button variant="link" onClick={clearAll}>
            Clear filters
          </Button>
        </div>
      ) : view === 'list' ? (
        <RevealGroup
          className={cn('flex flex-col gap-3 transition-opacity', isFetching && 'opacity-60')}
        >
          {products.map((p) => (
            <RevealItem key={p.id}>
              <ProductListRow product={p} />
            </RevealItem>
          ))}
        </RevealGroup>
      ) : (
        <RevealGroup
          className={cn(
            'grid transition-opacity',
            layout.grid,
            layout.gridGap,
            isFetching && 'opacity-60',
          )}
        >
          {products.map((p, i) => (
            <RevealItem key={p.id}>
              <ProductCard product={p} priority={i < 6} />
            </RevealItem>
          ))}
        </RevealGroup>
      )}

      {meta && meta.totalPages && meta.totalPages > 1 ? (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {meta.page} / {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= (meta.totalPages ?? 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className={cn(layout.container, layout.sectionPadding)}>
      {/* Dense layouts trade the masthead for a single line. */}
      {isDense ? (
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-display text-xl font-medium">The Collection</h1>
          {meta?.total !== undefined && (
            <p className="text-xs text-muted-foreground">{meta.total} results</p>
          )}
        </div>
      ) : (
        <Reveal className="mb-8 text-center">
          <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
            The Collection
          </h1>
          <span className="mx-auto mt-4 block h-px w-16 bg-brand" />
          {meta?.total !== undefined && (
            <p className="mt-3 text-sm text-muted-foreground">
              {meta.total} {meta.total === 1 ? 'piece' : 'pieces'} to discover
            </p>
          )}
        </Reveal>
      )}

      {/* Controls */}
      <div
        className={cn(
          'flex flex-wrap items-center justify-end gap-2',
          isDense ? 'mb-3' : 'mb-6',
        )}
      >
        {!isTopbar && (
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setShowFilters((s) => !s)}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filters
          </Button>
        )}

        <div
          role="group"
          aria-label="View as"
          className="flex overflow-hidden rounded-sm border"
        >
          <button
            type="button"
            onClick={() => setView('grid')}
            aria-pressed={view === 'grid'}
            aria-label="Grid view"
            className={cn(
              'p-2 transition-colors',
              view === 'grid'
                ? 'bg-foreground text-background'
                : 'hover:bg-accent',
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            aria-pressed={view === 'list'}
            aria-label="List view"
            className={cn(
              'p-2 transition-colors',
              view === 'list'
                ? 'bg-foreground text-background'
                : 'hover:bg-accent',
            )}
          >
            <Rows3 className="h-4 w-4" />
          </button>
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as ProductSort)}
          aria-label="Sort products"
          className={cn(
            'rounded-sm border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            isDense ? 'h-8 text-xs' : 'h-9',
          )}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* A slim nav already carries search — don't duplicate it. */}
        {layout.navbar !== 'slim' && (
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search the collection…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        )}
      </div>

      {isTopbar ? (
        // Filters run across the top; the grid gets the full width.
        <div className="space-y-8">
          <ProductFilters
            value={filters}
            onChange={setFilters}
            variant="topbar"
            scopeId={scope.id}
          />
          {results}
        </div>
      ) : (
        // Sidebar + grid. Column width is layout data, so it needs an inline
        // style — Tailwind can't generate a class from a runtime value.
        <div
          className="lg:grid"
          style={{
            gridTemplateColumns: `${layout.sidebarWidth} minmax(0, 1fr)`,
            gap: isDense ? '1.5rem' : '2.5rem',
          }}
        >
          <div className={cn('lg:block', showFilters ? 'block' : 'hidden')}>
            <ProductFilters
              value={filters}
              onChange={setFilters}
              dense={isDense}
              scopeId={scope.id}
            />
          </div>
          {results}
        </div>
      )}
    </div>
  );
}

/**
 * One product as a scannable row — the list view's unit.
 *
 * Wider than a card can be, so it shows what the grid truncates: the full
 * description line and price beside the rating. Deliberately not a second
 * ProductCard variant; a row and a card have different anatomies, and one
 * component serving both would be a thicket of conditionals.
 */
function ProductListRow({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex items-center gap-4 rounded-[var(--radius)] border p-3 transition-colors hover:border-brand"
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-sm bg-muted">
        {product.images?.[0]?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0].url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : null}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-lg leading-snug">
          {product.name}
        </p>
        {product.description ? (
          <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
            {product.description}
          </p>
        ) : null}
        {product.ratingCount > 0 && (
          <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <StarRating value={product.ratingAverage} />
            {product.ratingAverage.toFixed(1)} ({product.ratingCount})
          </span>
        )}
      </div>

      <p className="shrink-0 font-display text-lg font-medium">
        {formatPrice(product.basePrice, product.currency)}
      </p>
    </Link>
  );
}
