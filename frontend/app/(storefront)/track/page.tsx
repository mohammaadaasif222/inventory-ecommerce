'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, PackageSearch, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Reveal } from '@/components/storefront/motion';
import { ShipmentTracker } from '@/components/storefront/shipment-tracker';
import { useAuthStore } from '@/store/auth-store';
import { useTrackShipment } from '@/hooks/use-shipping';
import { useLayout } from '@/themes/runtime/theme-runtime';
import { cn } from '@/lib/utils';

/**
 * Public parcel tracking — anyone holding a tracking number can follow their
 * shipment, no account needed. Signed-in customers get richer per-order
 * tracking on their order pages; this is the door for everyone else.
 */
export default function TrackPage() {
  const layout = useLayout();
  const user = useAuthStore((s) => s.user);
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);

  const { data: tracking, isFetching, isError } = useTrackShipment(submitted);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = input.trim();
    if (value) setSubmitted(value);
  };

  return (
    <div className="flex flex-col">
      <section className="bg-secondary py-16 text-center text-secondary-foreground sm:py-20">
        <Reveal className={cn(layout.container, 'space-y-3')}>
          <h1 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">
            Track Your Order
          </h1>
          <p className="mx-auto max-w-xl text-sm text-secondary-foreground/75">
            Enter the tracking number from your dispatch email to see where
            your parcel is, from atelier to doorstep.
          </p>
        </Reveal>
      </section>

      <section className={cn(layout.container, 'max-w-2xl py-12')}>
        <form onSubmit={onSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. AWB123456789"
              aria-label="Tracking number"
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={isFetching || !input.trim()}>
            {isFetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Track
          </Button>
        </form>

        <div className="mt-8">
          {isError && submitted ? (
            <div className="flex flex-col items-center gap-2 rounded-[var(--radius)] border py-12 text-center">
              <PackageSearch className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Nothing found for “{submitted}”</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Check the number against your dispatch email — it may take a
                few hours after dispatch to appear here.
              </p>
            </div>
          ) : tracking ? (
            <div className="rounded-[var(--radius)] border bg-card p-6">
              <ShipmentTracker shipment={tracking} />
            </div>
          ) : null}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          {user ? (
            <>
              Looking for a full order?{' '}
              <Link href="/account" className="text-brand hover:underline">
                See your orders
              </Link>
            </>
          ) : (
            <>
              Have an account?{' '}
              <Link href="/login?redirect=/account" className="text-brand hover:underline">
                Sign in
              </Link>{' '}
              to see every order with live tracking.
            </>
          )}
        </p>
      </section>
    </div>
  );
}
