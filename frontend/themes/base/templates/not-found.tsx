'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useLayout } from '@/themes/runtime/theme-runtime';
import { cn } from '@/lib/utils';

/**
 * Base 404.
 *
 * Themed like every other page — a 404 is where a lost shopper decides whether
 * to keep browsing, and a default browser error page is a dead end that says
 * the shop is broken.
 */
export default function NotFoundTemplate() {
  const layout = useLayout();

  return (
    <div
      className={cn(
        layout.container,
        'flex min-h-[60vh] flex-col items-center justify-center gap-4 py-24 text-center',
      )}
    >
      <p className="font-display text-6xl font-medium text-brand">404</p>
      <h1 className="font-display text-2xl font-medium tracking-tight">
        This page doesn&apos;t exist
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        The link may be broken, or the page may have moved. The collection is
        still here.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/products">Browse the collection</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
