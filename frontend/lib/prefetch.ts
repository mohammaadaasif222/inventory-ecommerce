import 'server-only';
import { QueryClient, dehydrate, type DehydratedState } from '@tanstack/react-query';
import { config } from './config';
import type { ListingQuery } from '@/themes/contract';

/**
 * Server-side seeding of the client cache — the content-SSR half of the
 * storefront.
 *
 * Templates are client components that fetch through React Query, which means
 * their *markup* SSRs but their *data* used to arrive only after hydration:
 * crawlers (and first paint) saw spinners. These prefetchers run in the route,
 * seed a QueryClient with **exactly the keys and shapes the hooks use**, and
 * ship the dehydrated state; during SSR the same hooks find their data already
 * cached and render full content into the HTML.
 *
 * The contract that keeps this honest: every entry here mirrors one hook in
 * `hooks/use-storefront.ts` — same key, same unwrapping (`get` → data,
 * `getFull` → whole envelope). A mismatch is not an error, just dead weight:
 * hydration silently misses and the client refetches, so drift degrades to the
 * old behaviour rather than breaking anything. Failures likewise: a prefetch
 * that throws leaves its query unseeded, and `dehydrate` only ships successes.
 */

/** Server twin of the client api helper: envelope-unwrapping GET. */
async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const qs = params
    ? '?' +
      new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null && v !== '')
          .map(([k, v]) => [k, String(v)]),
      ).toString()
    : '';
  const res = await fetch(`${config.apiUrl}${path}${qs}`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  const body = (await res.json()) as { data: T };
  return body.data;
}

/** Server twin of `api.getFull`: the whole envelope, as list hooks expect. */
async function getFull<T>(
  path: string,
  params?: Record<string, unknown>,
): Promise<{ data: T }> {
  const qs =
    '?' +
    new URLSearchParams(
      Object.entries(params ?? {})
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => [k, String(v)]),
    ).toString();
  const res = await fetch(`${config.apiUrl}${path}${qs}`, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  return (await res.json()) as { data: T };
}

interface SectionForPrefetch {
  _id: string;
  type: string;
  config?: Record<string, unknown>;
}

/** Home: builder sections, the category tree, and every featured rail's products. */
export async function prefetchHome(): Promise<DehydratedState> {
  const qc = new QueryClient();

  await qc.prefetchQuery({
    queryKey: ['homepage'],
    queryFn: () => get<SectionForPrefetch[]>('/homepage'),
  });

  // Rails reference product ids in section config; seed each rail's query so
  // the carousels are in the HTML too, not just the section shells.
  const sections = qc.getQueryData<SectionForPrefetch[]>(['homepage']) ?? [];
  const railIdLists = sections
    .filter((s) => s.type === 'featured_products')
    .map((s) =>
      Array.isArray(s.config?.productIds) ? (s.config!.productIds as string[]) : [],
    )
    .filter((ids) => ids.length > 0);

  await Promise.all([
    qc.prefetchQuery({
      queryKey: ['categories'],
      queryFn: () => get('/catalog/categories'),
    }),
    ...railIdLists.map((ids) =>
      qc.prefetchQuery({
        queryKey: ['products-by-ids', ids],
        queryFn: () =>
          get('/products', { ids: ids.join(','), status: 'ACTIVE', limit: 24 }),
      }),
    ),
  ]);

  return dehydrate(qc);
}

/**
 * Listing: the first page for the route's parsed query.
 *
 * The key must reproduce `useStorefrontProducts`'s cleaned params object for
 * the template's *initial* state — page from the route, sort defaulted to
 * newest, empty filters dropped. If the template's initial state ever changes,
 * this drifts and the page falls back to client fetching (visible as a spinner
 * in view-source, which is the tell to re-align it).
 */
export async function prefetchListing(query: ListingQuery): Promise<DehydratedState> {
  const qc = new QueryClient();

  const clean = Object.fromEntries(
    Object.entries({
      page: query.page,
      categoryId: query.categoryId,
      brandId: query.brandId,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      minRating: query.minRating,
      sort: query.sort ?? 'newest',
    }).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );

  await qc.prefetchQuery({
    queryKey: ['storefront-products', clean],
    queryFn: () => getFull('/products', { ...clean, limit: 12, status: 'ACTIVE' }),
  });

  return dehydrate(qc);
}

/** Search: same listing hook, different initial state (term, no filters). */
export async function prefetchSearch(
  q: string,
  query: ListingQuery,
): Promise<DehydratedState> {
  const qc = new QueryClient();

  const clean = Object.fromEntries(
    Object.entries({
      page: query.page,
      search: q || undefined,
      sort: query.sort,
    }).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );

  await qc.prefetchQuery({
    queryKey: ['storefront-products', clean],
    queryFn: () => getFull('/products', { ...clean, limit: 12, status: 'ACTIVE' }),
  });

  return dehydrate(qc);
}

/** Product detail plus its related rail (which needs the product's id). */
export async function prefetchProduct(slug: string): Promise<DehydratedState> {
  const qc = new QueryClient();

  await qc.prefetchQuery({
    queryKey: ['product', slug],
    queryFn: () => get<{ id: string } | null>(`/products/slug/${slug}`),
  });

  const product = qc.getQueryData<{ id: string } | null>(['product', slug]);
  if (product?.id) {
    await qc.prefetchQuery({
      queryKey: ['related', product.id, 8],
      queryFn: () => get(`/recommendations/related/${product.id}`, { limit: 8 }),
    });
  }

  return dehydrate(qc);
}

/** Blog index (journal posts only). */
export async function prefetchBlogIndex(): Promise<DehydratedState> {
  const qc = new QueryClient();
  await qc.prefetchQuery({
    queryKey: ['kb-articles', 'post'],
    queryFn: () => get('/knowledge-base/articles', { kind: 'post' }),
  });
  return dehydrate(qc);
}

/**
 * A single post. This endpoint counts a view — correctly so, since this fetch
 * happens once per actual page render (unlike the metadata builder, which
 * reads the list endpoint for exactly this reason).
 */
export async function prefetchBlogPost(slug: string): Promise<DehydratedState> {
  const qc = new QueryClient();
  await qc.prefetchQuery({
    queryKey: ['kb-article', slug],
    queryFn: () => get(`/knowledge-base/articles/${slug}`),
  });
  return dehydrate(qc);
}
