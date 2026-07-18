import { HydrationBoundary } from '@tanstack/react-query';
import { getActiveTheme } from '@/lib/active-theme';
import { resolveTemplate } from '@/themes/resolver';
import { staticPageMetadata } from '@/lib/seo';
import { prefetchBlogIndex } from '@/lib/prefetch';

export function generateMetadata() {
  return staticPageMetadata('Journal', 'Stories, notes and guides from the house.');
}

/** Blog index. The single-post route passes a slug to the same template. */
export default async function BlogIndexPage() {
  const { slug } = await getActiveTheme();
  const [Template, state] = await Promise.all([
    resolveTemplate(slug, 'blog'),
    prefetchBlogIndex(),
  ]);
  return (
    <HydrationBoundary state={state}>
      <Template />
    </HydrationBoundary>
  );
}
