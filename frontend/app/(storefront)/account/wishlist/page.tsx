'use client';

import Link from 'next/link';
import { Heart, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/storefront/product-card';
import { Reveal, RevealGroup, RevealItem } from '@/components/storefront/motion';
import { useWishlist } from '@/hooks/use-wishlist';
import { useAuthStore } from '@/store/auth-store';

export default function WishlistPage() {
  const signedIn = useAuthStore((s) => !!s.user);
  const { data: products, isLoading } = useWishlist();

  if (!signedIn) {
    return (
      <div className="container flex flex-col items-center gap-4 py-24 text-center">
        <Heart className="h-10 w-10 text-muted-foreground" />
        <p className="font-display text-2xl">Your saved list</p>
        <p className="text-sm text-muted-foreground">
          Sign in to see the fragrances you&apos;ve saved.
        </p>
        <Button asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="container flex flex-col items-center gap-4 py-24 text-center">
        <Heart className="h-10 w-10 text-muted-foreground" />
        <p className="font-display text-2xl">Nothing saved yet</p>
        <p className="text-sm text-muted-foreground">
          Tap the heart on any fragrance to keep it here.
        </p>
        <Button asChild>
          <Link href="/products">Browse the collection</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <Reveal className="mb-10 text-center">
        <h1 className="font-display text-4xl font-medium tracking-tight">
          Saved
        </h1>
        <span className="mx-auto mt-4 block h-px w-16 bg-brand" />
        <p className="mt-3 text-sm text-muted-foreground">
          {products.length} {products.length === 1 ? 'fragrance' : 'fragrances'}{' '}
          saved
        </p>
      </Reveal>

      <RevealGroup className="grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <RevealItem key={p.id}>
            <ProductCard product={p} />
          </RevealItem>
        ))}
      </RevealGroup>
    </div>
  );
}
