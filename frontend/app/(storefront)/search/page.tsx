import { getActiveTheme } from '@/lib/active-theme';
import { resolveTemplate } from '@/themes/resolver';
import {
  parseListingQuery,
  parseSearchTerm,
  type RawSearchParams,
} from '@/themes/query';
import { privateMetadata } from '@/lib/seo';
import { prefetchSearch } from '@/lib/prefetch';
import { HydrationBoundary } from '@tanstack/react-query';

export function generateMetadata() {
  // Infinite query-string permutations — noindex keeps crawlers out of them.
  return privateMetadata('Search');
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: RawSearchParams;
}) {
  const { slug } = await getActiveTheme();
  const q = parseSearchTerm(searchParams);
  const query = parseListingQuery(searchParams);
  const [Template, state] = await Promise.all([
    resolveTemplate(slug, 'search'),
    prefetchSearch(q, query),
  ]);
  return (
    <HydrationBoundary state={state}>
      <Template q={q} query={query} />
    </HydrationBoundary>
  );
}
