import { HydrationBoundary } from '@tanstack/react-query';
import { getActiveTheme } from '@/lib/active-theme';
import { resolveTemplate } from '@/themes/resolver';
import { parseListingQuery, type RawSearchParams } from '@/themes/query';
import { staticPageMetadata } from '@/lib/seo';
import { prefetchListing } from '@/lib/prefetch';

export function generateMetadata() {
  return staticPageMetadata(
    'The Collection',
    'Browse the full catalog — filter by category, price and rating.',
  );
}

/**
 * Product listing.
 *
 * Search params are parsed here, in core, so every theme's listing agrees on
 * what a filter means. Parsing server-side also removes the `useSearchParams`
 * Suspense boundary the old page needed.
 */
export default async function ProductsPage({
  searchParams,
}: {
  searchParams: RawSearchParams;
}) {
  const { slug } = await getActiveTheme();
  const query = parseListingQuery(searchParams);
  const [Template, state] = await Promise.all([
    resolveTemplate(slug, 'category'),
    prefetchListing(query),
  ]);
  return (
    <HydrationBoundary state={state}>
      <Template query={query} />
    </HydrationBoundary>
  );
}
