'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import { StarRating } from '@/components/ui/star-rating';
import { useAuthStore } from '@/store/auth-store';
import { useToggleWishlist, useWishlistIds } from '@/hooks/use-wishlist';
import { useLayout } from '@/themes/runtime/theme-runtime';
import { cn } from '@/lib/utils';
import type { Product } from '@/schemas/product.schema';

export function formatPrice(amount: number, currency = 'INR'): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}

/** Heart toggle. Signed-out users get a nudge instead of a silent no-op. */
export function WishlistButton({
  productId,
  className,
}: {
  productId: string;
  className?: string;
}) {
  const signedIn = useAuthStore((s) => !!s.user);
  const { data: ids } = useWishlistIds();
  const toggle = useToggleWishlist();
  const active = ids?.includes(productId) ?? false;

  return (
    <button
      type="button"
      aria-label={active ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={active}
      onClick={(e) => {
        // The card is a link — don't navigate when hearting.
        e.preventDefault();
        e.stopPropagation();
        if (!signedIn) {
          toast.error('Sign in to save favourites');
          return;
        }
        toggle.mutate(productId);
      }}
      className={cn(
        'rounded-full bg-background/80 p-2 backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      <motion.span
        key={String(active)}
        initial={{ scale: 1 }}
        animate={active ? { scale: [1, 1.35, 1] } : { scale: 1 }}
        transition={{ duration: 0.32 }}
        className="block"
      >
        <Heart
          className={cn(
            'h-4 w-4 transition-colors',
            active ? 'fill-destructive text-destructive' : 'text-foreground/70',
          )}
        />
      </motion.span>
    </button>
  );
}

export function ProductCard({
  product,
  priority,
}: {
  product: Product;
  priority?: boolean;
}) {
  const reduced = useReducedMotion();
  const layout = useLayout();
  const img = product.images?.[0]?.url;
  const { aspect, align, titleSize, showRating } = layout.card;
  const centred = align === 'center';

  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <motion.article
        whileHover={reduced ? undefined : { y: -4 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="flex h-full flex-col"
      >
        <div
          className={cn('relative overflow-hidden rounded-sm bg-muted', aspect)}
        >
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img}
              alt={product.name}
              loading={priority ? 'eager' : 'lazy'}
              className={cn(
                'h-full w-full object-cover',
                !reduced &&
                  'transition-transform duration-700 group-hover:scale-105',
              )}
            />
          ) : null}

          <WishlistButton
            productId={product.id}
            className="absolute right-2 top-2 opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 sm:opacity-0"
          />

          {product.ratingCount === 0 && (
            <span className="absolute left-2 top-2 rounded-sm bg-brand px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-foreground">
              New
            </span>
          )}
        </div>

        <div
          className={cn(
            'flex flex-1 flex-col gap-1',
            centred ? 'items-center pt-4 text-center' : 'pt-3',
          )}
        >
          <h3
            className={cn(
              'font-display font-medium leading-snug',
              titleSize,
              // Dense grids can't afford two-line titles.
              !showRating && 'truncate',
            )}
          >
            {product.name}
          </h3>

          {showRating && (
            <div
              className={cn(
                'flex h-4 items-center gap-1.5',
                centred && 'justify-center',
              )}
            >
              {product.ratingCount > 0 ? (
                <>
                  <StarRating value={product.ratingAverage} size="sm" />
                  <span className="text-xs text-muted-foreground">
                    ({product.ratingCount})
                  </span>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">
                  No reviews yet
                </span>
              )}
            </div>
          )}

          <p
            className={cn(
              'mt-auto pt-1 font-medium tracking-wide',
              centred ? 'text-base' : 'text-sm',
            )}
          >
            {formatPrice(product.basePrice, product.currency)}
          </p>
        </div>
      </motion.article>
    </Link>
  );
}
