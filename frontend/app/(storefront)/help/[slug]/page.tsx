'use client';

import { useParams } from 'next/navigation';
import { Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { useArticle } from '@/hooks/use-storefront';

interface Block {
  type: string;
  data: Record<string, unknown>;
}

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading } = useArticle(slug);

  const vote = (helpful: boolean) =>
    api
      .post(`/knowledge-base/articles/${slug}/vote`, { helpful })
      .then(() => toast.success('Thanks for your feedback!'))
      .catch(() => toast.error('Could not record vote'));

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!article) {
    return <p className="container py-16 text-center text-muted-foreground">Article not found.</p>;
  }

  return (
    <article className="container max-w-2xl space-y-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{article.title}</h1>
        {article.excerpt ? <p className="text-muted-foreground">{article.excerpt}</p> : null}
      </header>

      <div className="space-y-4 leading-relaxed">
        {(article.blocks ?? []).map((block: Block, i) => (
          <BlockRenderer key={i} block={block} />
        ))}
      </div>

      <div className="flex items-center gap-3 border-t pt-6">
        <span className="text-sm text-muted-foreground">Was this helpful?</span>
        <Button variant="outline" size="sm" onClick={() => vote(true)}>
          <ThumbsUp className="mr-1 h-4 w-4" /> Yes
        </Button>
        <Button variant="outline" size="sm" onClick={() => vote(false)}>
          <ThumbsDown className="mr-1 h-4 w-4" /> No
        </Button>
      </div>
    </article>
  );
}

function BlockRenderer({ block }: { block: Block }) {
  const text = String(block.data?.text ?? '');
  switch (block.type) {
    case 'heading':
      return <h2 className="text-xl font-semibold">{text}</h2>;
    case 'image':
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={String(block.data?.url ?? '')} alt="" className="rounded-lg" />;
    case 'list':
      return (
        <ul className="list-disc pl-6">
          {(block.data?.items as string[] | undefined)?.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case 'code':
      return (
        <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-sm">
          <code>{text}</code>
        </pre>
      );
    default:
      return <p>{text}</p>;
  }
}
