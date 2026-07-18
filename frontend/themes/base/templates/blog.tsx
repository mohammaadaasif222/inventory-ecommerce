'use client';

import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Reveal, RevealGroup, RevealItem } from '@/components/storefront/motion';
import { useArticle, useArticles, type KbArticle } from '@/hooks/use-storefront';
import { useLayout } from '@/themes/runtime/theme-runtime';
import { cn } from '@/lib/utils';
import type { BlogTemplateProps } from '@/themes/contract';

/**
 * Base blog — index and single post from one template.
 *
 * Backed by the knowledge-base collection: block-structured Mongo documents
 * with a title, slug, excerpt and publish state, which is exactly the shape a
 * blog needs. The `kind` discriminator keeps the two surfaces disjoint —
 * `post` articles are the journal, `help` articles stay in the support centre.
 */
export default function BlogTemplate({ slug }: BlogTemplateProps) {
  return slug ? <Post slug={slug} /> : <Index />;
}

function Index() {
  const layout = useLayout();
  const { data: posts, isLoading } = useArticles('post');

  if (isLoading) return <Spinner />;

  return (
    <div className={cn(layout.container, layout.sectionPadding)}>
      <Reveal className="mb-10 text-center">
        <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
          Journal
        </h1>
        <span className="mx-auto mt-4 block h-px w-16 bg-brand" />
      </Reveal>

      {!posts || posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <p className="font-display text-xl">No posts yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Stories, notes and guides will appear here once they are published.
          </p>
          <Button asChild variant="outline">
            <Link href="/products">Browse the collection</Link>
          </Button>
        </div>
      ) : (
        <RevealGroup className="grid gap-x-8 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <RevealItem key={post._id}>
              <Card post={post} />
            </RevealItem>
          ))}
        </RevealGroup>
      )}
    </div>
  );
}

function Card({ post }: { post: KbArticle }) {
  return (
    <article className="group flex h-full flex-col">
      <h2 className="font-display text-xl font-medium leading-snug">
        <Link
          href={`/blog/${post.slug}`}
          className="transition-colors hover:text-brand focus-visible:text-brand focus-visible:outline-none"
        >
          {post.title}
        </Link>
      </h2>
      {post.excerpt ? (
        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
          {post.excerpt}
        </p>
      ) : null}
      <Link
        href={`/blog/${post.slug}`}
        className="mt-4 text-xs uppercase tracking-widest text-brand"
        tabIndex={-1}
        aria-hidden
      >
        Read
      </Link>
    </article>
  );
}

function Post({ slug }: { slug: string }) {
  const layout = useLayout();
  const { data: post, isLoading, isError } = useArticle(slug);

  if (isLoading) return <Spinner />;

  if (isError || !post) {
    return (
      <div className={cn(layout.container, 'py-24 text-center')}>
        <h1 className="font-display text-2xl font-medium">Post not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been unpublished or moved.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/blog">Back to the journal</Link>
        </Button>
      </div>
    );
  }

  return (
    <article className={cn(layout.container, layout.sectionPadding, 'max-w-2xl')}>
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Journal
      </Link>

      <h1 className="mt-6 font-display text-4xl font-medium leading-tight tracking-tight">
        {post.title}
      </h1>
      {post.excerpt ? (
        <p className="mt-3 text-lg text-muted-foreground">{post.excerpt}</p>
      ) : null}
      <span className="mt-8 block h-px w-16 bg-brand" />

      <div className="mt-8 space-y-6">
        {(post.blocks ?? []).map((block, i) => (
          <Block key={i} type={block.type} data={block.data} />
        ))}
      </div>
    </article>
  );
}

/**
 * Render one content block.
 *
 * Unknown types render nothing rather than throwing: the block schema is
 * authored in the admin and may gain types this template predates, and a post
 * that silently omits one new block still reads fine — a post that crashes does
 * not.
 */
function Block({ type, data }: { type: string; data: Record<string, unknown> }) {
  switch (type) {
    case 'heading':
      return (
        <h2 className="font-display text-2xl font-medium">
          {String(data.text ?? '')}
        </h2>
      );

    case 'paragraph':
    case 'rich_text':
      return (
        <div
          className="prose-sm leading-relaxed text-foreground/90 [&_a]:text-brand [&_a]:underline"
          // Admin-authored content; trusted CMS field.
          dangerouslySetInnerHTML={{ __html: String(data.html ?? data.text ?? '') }}
        />
      );

    case 'image':
      return data.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={String(data.url)}
          alt={String(data.alt ?? '')}
          className="w-full rounded-[var(--radius)]"
        />
      ) : null;

    case 'quote':
      return (
        <blockquote className="border-l-2 border-brand pl-5 font-display text-xl italic">
          {String(data.text ?? '')}
        </blockquote>
      );

    case 'divider':
      return <hr className="border-border" />;

    default:
      return null;
  }
}

function Spinner() {
  return (
    <div className="flex h-96 items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
