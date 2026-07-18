'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  Truck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StarRating } from '@/components/ui/star-rating';
import { ProductReviews } from '@/components/storefront/product-reviews';
import { ProductRail } from '@/components/storefront/product-rail';
import { Reveal } from '@/components/storefront/motion';
import {
  WishlistButton,
  formatPrice,
} from '@/components/storefront/product-card';
import { useLayout, useTheme } from '@/themes/runtime/theme-runtime';
import { useProductBySlug, useRelatedProducts } from '@/hooks/use-storefront';
import { useCartStore } from '@/store/cart-store';
import { cn } from '@/lib/utils';
import type { ProductTemplateProps } from '@/themes/contract';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Assurances shown under the buy box — static copy, not backed by config. */
const ASSURANCES = [
  { icon: Truck, label: 'Free delivery over ₹999' },
  { icon: RotateCcw, label: '30-day returns' },
  { icon: ShieldCheck, label: 'Authenticity guaranteed' },
];

/**
 * `tags` mixes scent notes with wear attributes. Only these are attributes —
 * anything else is treated as a note, so a new note needs no code change.
 */
const ATTRIBUTE_TAGS = new Set([
  'unisex',
  'feminine',
  'masculine',
  'spring',
  'summer',
  'autumn',
  'winter',
  'daytime',
  'evening',
  'sporty',
  'luxury',
]);

const prettify = (tag: string) => tag.replace(/-/g, ' ');

export default function ProductTemplate({ slug }: ProductTemplateProps) {
  const reduced = useReducedMotion();
  const layout = useLayout();
  const { name: themeName } = useTheme();
  const { data: product, isLoading } = useProductBySlug(slug);
  const { data: related } = useRelatedProducts(product?.id, 8);

  const [active, setActive] = useState(0);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [zoom, setZoom] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!product) {
    return (
      <div className={cn(layout.container, "flex flex-col items-center gap-3 py-24 text-center")}>
        <p className="font-display text-2xl">Fragrance not found</p>
        <Button asChild variant="link">
          <Link href="/products">Back to the collection</Link>
        </Button>
      </div>
    );
  }

  const images = product.images ?? [];
  const variants = product.variants ?? [];
  const variant = variants.find((v) => v.id === variantId);
  const price = variant?.price ?? product.basePrice;
  const isStacked = layout.pdp === 'stacked';
  const isDense = layout.pdp === 'dense';
  const tags = product.tags ?? [];
  const notes = tags.filter((t) => !ATTRIBUTE_TAGS.has(t));
  const attributes = tags.filter((t) => ATTRIBUTE_TAGS.has(t));

  const addToCart = () => {
    // Orders are placed per variant SKU; require/auto-pick one.
    const chosen = variant ?? (variants.length === 1 ? variants[0] : null);
    if (!chosen) {
      toast.error('Please choose a size first');
      return;
    }
    useCartStore.getState().add(
      {
        productId: product.id,
        variantId: chosen.id,
        sku: chosen.sku,
        name: product.name,
        variantLabel: Object.values(chosen.attributes).join(' / ') || chosen.sku,
        price: chosen.price ?? product.basePrice,
        currency: product.currency,
        image: images[0]?.url,
      },
      qty,
    );
    toast.success(`Added ${qty} × “${product.name}” to your bag`);
  };

  return (
    <div className="pb-4">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className={cn(layout.container, "flex items-center gap-1.5 py-5 text-xs text-muted-foreground")}
      >
        <Link href="/" className="transition-colors hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/products" className="transition-colors hover:text-foreground">
          Collection
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="truncate text-foreground">{product.name}</span>
      </nav>

      <div
        className={cn(
          layout.container,
          "grid gap-10",
          // Stacked = one column (gallery over details); split/dense = two.
          !isStacked && "lg:grid-cols-2",
          isDense ? "lg:gap-8" : "lg:gap-16",
        )}
      >
        {/* ── Gallery ── */}
        <div
          className={cn(
            "flex flex-col-reverse gap-4 sm:flex-row",
            // Sticky only helps beside a long details column.
            !isStacked && "lg:sticky lg:top-24 lg:self-start",
          )}
        >
          {images.length > 1 && (
            <div className="flex gap-2 sm:flex-col">
              {images.map((img, i) => (
                <button
                  key={img.storageId}
                  onClick={() => setActive(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-current={i === active}
                  className={cn(
                    'h-16 w-16 shrink-0 overflow-hidden rounded-sm border transition-all',
                    i === active
                      ? 'border-brand ring-1 ring-brand'
                      : 'border-transparent opacity-60 hover:opacity-100',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          <div
            className={cn(
              "relative flex-1 overflow-hidden rounded-sm bg-muted",
              isStacked ? "aspect-[16/10]" : isDense ? "aspect-square" : "aspect-[4/5]",
            )}
            onMouseEnter={() => setZoom(true)}
            onMouseLeave={() => setZoom(false)}
          >
            <AnimatePresence mode="wait">
              {images[active] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <motion.img
                  key={images[active].storageId}
                  src={images[active].url}
                  alt={product.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, scale: zoom && !reduced ? 1.06 : 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
            </AnimatePresence>

            {product.ratingCount === 0 && (
              <span className="absolute left-3 top-3 rounded-sm bg-brand px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-foreground">
                New
              </span>
            )}
          </div>
        </div>

        {/* ── Details ── */}
        <Reveal className="flex flex-col gap-5 lg:py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.3em] text-brand">
                {themeName}
              </p>
              <h1 className="font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
                {product.name}
              </h1>
            </div>
            <WishlistButton
              productId={product.id}
              className="mt-1 shrink-0 border"
            />
          </div>

          {product.ratingCount > 0 ? (
            <a
              href="#reviews"
              className="flex w-fit items-center gap-2 text-sm transition-opacity hover:opacity-70"
            >
              <StarRating value={product.ratingAverage} />
              <span className="font-medium">
                {product.ratingAverage.toFixed(1)}
              </span>
              <span className="text-muted-foreground underline underline-offset-4">
                {product.ratingCount}{' '}
                {product.ratingCount === 1 ? 'review' : 'reviews'}
              </span>
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">
              No reviews yet — be the first
            </p>
          )}

          <p className="font-display text-3xl font-medium">
            {formatPrice(price, product.currency)}
          </p>

          {product.description ? (
            <p className="max-w-prose leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          ) : null}

          <Separator />

          {/* Size / concentration */}
          {variants.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Size
              </p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => {
                  const label =
                    Object.values(v.attributes).join(' · ') || v.sku;
                  const selected = v.id === variantId;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setVariantId(v.id)}
                      aria-pressed={selected}
                      className={cn(
                        'rounded-sm border px-4 py-2 text-sm transition-all',
                        selected
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-input hover:border-foreground',
                      )}
                    >
                      {label}
                      {v.price != null && v.price !== product.basePrice && (
                        <span
                          className={cn(
                            'ml-2 text-xs',
                            selected
                              ? 'text-background/70'
                              : 'text-muted-foreground',
                          )}
                        >
                          {formatPrice(v.price, product.currency)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity + add to cart */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <div className="flex items-center rounded-sm border">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                disabled={qty <= 1}
                className="p-2.5 transition-opacity disabled:opacity-30"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 text-center text-sm tabular-nums">{qty}</span>
              <button
                onClick={() => setQty((q) => Math.min(10, q + 1))}
                aria-label="Increase quantity"
                disabled={qty >= 10}
                className="p-2.5 transition-opacity disabled:opacity-30"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <Button
              size="lg"
              onClick={addToCart}
              disabled={variants.length === 0}
              className="flex-1 sm:flex-none sm:px-10"
            >
              {variants.length === 0 ? 'Unavailable' : 'Add to bag'}
            </Button>
          </div>

          {/* Assurances */}
          <ul className="grid gap-2 pt-2">
            {ASSURANCES.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-brand" />
                {label}
              </li>
            ))}
          </ul>

          {/* Composition — scent notes, with wear attributes kept separate */}
          {notes.length > 0 || attributes.length > 0 ? (
            <>
              <Separator />
              <div className="space-y-4">
                {notes.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      The composition
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      {notes.map((tag, i) => (
                        <span key={tag} className="flex items-center gap-2">
                          <span className="font-display text-lg capitalize">
                            {prettify(tag)}
                          </span>
                          {i < notes.length - 1 && (
                            <span className="text-brand">·</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {attributes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {attributes.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-sm border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground"
                      >
                        {prettify(tag)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </Reveal>
      </div>

      {/* ── Reviews ── */}
      <div className={cn(layout.container, isStacked ? "mt-16" : "mt-20")}>
        <Separator />
        <div id="reviews" className="max-w-3xl scroll-mt-24 py-14">
          <ProductReviews productId={product.id} />
        </div>
        <Separator />
      </div>

      {/* ── Related ── */}
      {related && related.length > 0 && (
        <ProductRail
          title="You may also like"
          subtitle="Chosen from the same family"
          products={related}
        />
      )}
    </div>
  );
}
