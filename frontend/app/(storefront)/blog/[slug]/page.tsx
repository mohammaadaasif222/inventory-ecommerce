import { HydrationBoundary } from '@tanstack/react-query';
import { getActiveTheme } from '@/lib/active-theme';
import { resolveTemplate } from '@/themes/resolver';
import { blogPostMetadata } from '@/lib/seo';
import { prefetchBlogPost } from '@/lib/prefetch';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  return blogPostMetadata(params.slug);
}

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug: themeSlug } = await getActiveTheme();
  const [Template, state] = await Promise.all([
    resolveTemplate(themeSlug, 'blog'),
    prefetchBlogPost(params.slug),
  ]);
  return (
    <HydrationBoundary state={state}>
      <Template slug={params.slug} />
    </HydrationBoundary>
  );
}
