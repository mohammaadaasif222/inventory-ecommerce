import { HydrationBoundary } from '@tanstack/react-query';
import { getActiveTheme } from '@/lib/active-theme';
import { resolveTemplate } from '@/themes/resolver';
import { productMetadata } from '@/lib/seo';
import { prefetchProduct } from '@/lib/prefetch';

/** Name, snippet, OG image — admin SEO overrides win over product fields. */
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  return productMetadata(params.slug);
}

/** Product detail. The slug reaches the template as a prop, not via a hook. */
export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug: themeSlug } = await getActiveTheme();
  const [Template, state] = await Promise.all([
    resolveTemplate(themeSlug, 'product'),
    prefetchProduct(params.slug),
  ]);
  return (
    <HydrationBoundary state={state}>
      <Template slug={params.slug} />
    </HydrationBoundary>
  );
}
