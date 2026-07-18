import { HydrationBoundary } from '@tanstack/react-query';
import { getActiveTheme } from '@/lib/active-theme';
import { resolveTemplate } from '@/themes/resolver';
import { homeMetadata } from '@/lib/seo';
import { prefetchHome } from '@/lib/prefetch';

export function generateMetadata() {
  // Admin's global SEO defaults, theme name as the fallback.
  return homeMetadata();
}

/**
 * Home.
 *
 * The route's whole job is to name a template id; which package answers is the
 * resolver's business. This file never changes when a theme is added.
 *
 * The prefetch seeds the template's queries server-side, so the sections and
 * rails are in the HTML rather than arriving after hydration.
 */
export default async function HomePage() {
  const { slug } = await getActiveTheme();
  const [Template, state] = await Promise.all([
    resolveTemplate(slug, 'home'),
    prefetchHome(),
  ]);
  return (
    <HydrationBoundary state={state}>
      <Template />
    </HydrationBoundary>
  );
}
