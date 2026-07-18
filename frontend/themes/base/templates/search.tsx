'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Search as SearchIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/storefront/product-card';
import { RevealGroup, RevealItem } from '@/components/storefront/motion';
import { useLayout } from '@/themes/runtime/theme-runtime';
import { useStorefrontProducts } from '@/hooks/use-storefront';
import { cn } from '@/lib/utils';
import type { SearchTemplateProps } from '@/themes/contract';

/**
 * Base search results.
 *
 * Separate from the category template even though both list products: search
 * has a query to echo back, a genuinely different empty state ("no results for
 * X" rather than "no products match these filters"), and no filter sidebar to
 * start from. Folding them together would mean a template full of
 * `isSearch ?` branches.
 */
export default function SearchTemplate({ q, query }: SearchTemplateProps) {
  const layout = useLayout();
  const router = useRouter();
  const [term, setTerm] = useState(q);

  const { data, isLoading } = useStorefrontProducts({
    page: query.page,
    search: q || undefined,
    sort: query.sort,
  });

  const products = data?.data ?? [];
  const total = data?.meta?.total;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // Push rather than replace: a search is a place a shopper can go back from.
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <div className={cn(layout.container, layout.sectionPadding)}>
      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-display text-3xl font-medium tracking-tight">
          Search
        </h1>
        <form onSubmit={submit} className="relative mt-6">
          <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search the collection…"
            aria-label="Search products"
            className="h-11 pl-9"
          />
        </form>
      </div>

      {q ? (
        <p className="mt-8 text-sm text-muted-foreground">
          {isLoading
            ? 'Searching…'
            : `${total ?? products.length} result${total === 1 ? '' : 's'} for “${q}”`}
        </p>
      ) : null}

      <div className="mt-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !q ? (
          <EmptyState
            title="What are you looking for?"
            body="Type above to search the whole catalog by name, brand or tag."
          />
        ) : products.length === 0 ? (
          <EmptyState
            title={`Nothing matches “${q}”`}
            body="Check the spelling, or try a broader term."
            action={
              <Button asChild variant="outline">
                <Link href="/products">Browse everything</Link>
              </Button>
            }
          />
        ) : (
          <RevealGroup className={cn('grid', layout.grid, layout.gridGap)}>
            {products.map((p, i) => (
              <RevealItem key={p.id}>
                <ProductCard product={p} priority={i < 6} />
              </RevealItem>
            ))}
          </RevealGroup>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <p className="font-display text-xl">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {action}
    </div>
  );
}
