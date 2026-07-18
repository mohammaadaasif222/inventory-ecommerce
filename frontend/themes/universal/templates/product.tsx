'use client';

import { useState } from 'react';
import Link from 'next/link';
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
import {
  WishlistButton,
  formatPrice,
} from '@/components/storefront/product-card';
import { useLayout } from '@/themes/runtime/theme-runtime';
import { useProductBySlug, useRelatedProducts } from '@/hooks/use-storefront';
import { useCartStore } from '@/store/cart-store';
import { cn } from '@/lib/utils';
import type { ProductVariant } from '@/schemas/product.schema';
import type { ProductTemplateProps } from '@/themes/contract';

/** Assurances under the buy button — static copy, not backed by config. */
const ASSURANCES = [
  { icon: Truck, label: 'Free delivery over ₹999' },
  { icon: RotateCcw, label: 'Free returns within 7 days' },
  { icon: ShieldCheck, label: 'Secure payment' },
];

type StockState = 'in' | 'low' | 'out';

/**
 * The storefront product carries no stock counts today, so "sellable variants
 * exist" is the baseline signal. If the API starts reporting per-variant
 * stock, this picks it up without a schema change.
 */
function variantStock(v: ProductVariant): number | undefined {
  const raw = (v as ProductVariant & { stock?: unknown }).stock;
  return typeof raw === 'number' ? raw : undefined;
}

function stockState(
  variants: ProductVariant[],
  selected: ProductVariant | undefined,
): StockState {
  if (variants.length === 0) return 'out';
  const counts = (selected ? [selected] : variants)
    .map(variantStock)
    .filter((n): n is number => n !== undefined);
  if (counts.length === 0) return 'in';
  if (counts.every((n) => n <= 0)) return 'out';
  if (Math.max(...counts) <= 5) return 'low';
  return 'in';
}

const STOCK_COPY: Record<StockState, { label: string; dot: string; text: string }> = {
  in: { label: 'In stock', dot: 'bg-brand', text: 'text-muted-foreground' },
  // Destructive doubles as the urgency colour, so a re-branded palette still
  // drives it — no hardcoded amber that the customiser cannot reach.
  low: { label: 'Only a few left', dot: 'bg-destructive', text: 'text-destructive' },
  out: { label: 'Out of stock', dot: 'bg-muted-foreground', text: 'text-muted-foreground' },
};

function StockBadge({ state }: { state: StockState }) {
  const { label, dot, text } = STOCK_COPY[state];
  return (
    <span className={cn('flex items-center gap-1.5 text-sm font-medium', text)}>
      <span className={cn('h-2 w-2 rounded-full', dot)} aria-hidden />
      {label}
    </span>
  );
}

/**
 * Universal product page — buy-box first.
 *
 * Same data flow as base (slug → product, related, per-SKU cart add); the
 * difference is emphasis: gallery left, a self-contained buy box right, and
 * the trust signals at the moment of decision rather than below the fold.
 */
export default function ProductTemplate({ slug }: ProductTemplateProps) {
  const layout = useLayout();
  const { data: product, isLoading } = useProductBySlug(slug);
  const { data: related } = useRelatedProducts(product?.id, 8);

  const [active, setActive] = useState(0);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!product) {
    return (
      <div
        className={cn(
          layout.container,
          'flex flex-col items-center gap-3 py-24 text-center',
        )}
      >
        <p className="font-display text-2xl font-semibold">Product not found</p>
        <Button asChild variant="link">
          <Link href="/products">Browse all products</Link>
        </Button>
      </div>
    );
  }

  const images = product.images ?? [];
  const variants = product.variants ?? [];
  const variant = variants.find((v) => v.id === variantId);
  const price = variant?.price ?? product.basePrice;
  const stock = stockState(variants, variant);
  const isDense = layout.pdp === 'dense';

  const addToCart = () => {
    // Orders are placed per variant SKU; require/auto-pick one.
    const chosen = variant ?? (variants.length === 1 ? variants[0] : null);
    if (!chosen) {
      toast.error('Please choose an option first');
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
    toast.success(`Added ${qty} × “${product.name}” to your cart`);
  };

  return (
    <div className="pb-4">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className={cn(
          layout.container,
          'flex items-center gap-1.5 py-4 text-xs text-muted-foreground',
        )}
      >
        <Link href="/" className="transition-colors hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/products" className="transition-colors hover:text-foreground">
          All products
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="truncate text-foreground">{product.name}</span>
      </nav>

      <div
        className={cn(
          layout.container,
          // Gallery outweighs the buy box slightly — the photo does the
          // selling; the box does the closing.
          'grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]',
          isDense ? 'lg:gap-8' : 'lg:gap-12',
        )}
      >
        {/* ── Gallery ── */}
        <div className="flex flex-col gap-3 lg:sticky lg:top-24 lg:self-start">
          <div className="relative aspect-square overflow-hidden rounded-md border bg-muted">
            {images[active] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={images[active].url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              // A product without photos still needs a designed surface.
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No image available
              </div>
            )}

            {product.ratingCount === 0 && (
              <span className="absolute left-3 top-3 rounded-sm bg-brand px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-foreground">
                New
              </span>
            )}
          </div>

          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={img.storageId}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-current={i === active}
                  className={cn(
                    'h-16 w-16 shrink-0 overflow-hidden rounded-md border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    i === active
                      ? 'border-brand ring-1 ring-brand'
                      : 'border-border opacity-70 hover:opacity-100',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Buy box ── */}
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
              {product.name}
            </h1>
            <WishlistButton
              productId={product.id}
              className="mt-0.5 shrink-0 border"
            />
          </div>

          {product.ratingCount > 0 ? (
            <a
              href="#reviews"
              className="flex w-fit items-center gap-2 text-sm transition-opacity hover:opacity-70"
            >
              <StarRating value={product.ratingAverage} size="sm" />
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

          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p className="text-3xl font-semibold tracking-tight">
              {formatPrice(price, product.currency)}
            </p>
            <StockBadge state={stock} />
          </div>

          {product.description ? (
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          ) : null}

          <Separator />

          {variants.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Options</p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => {
                  const label =
                    Object.values(v.attributes).join(' · ') || v.sku;
                  const selected = v.id === variantId;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVariantId(v.id)}
                      aria-pressed={selected}
                      className={cn(
                        'rounded-md border px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        selected
                          ? 'border-brand bg-brand text-brand-foreground'
                          : 'border-input hover:border-brand',
                      )}
                    >
                      {label}
                      {v.price != null && v.price !== product.basePrice && (
                        <span
                          className={cn(
                            'ml-2 text-xs',
                            selected
                              ? 'text-brand-foreground/80'
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
          <div className="flex items-center gap-3 pt-1">
            <div className="flex items-center rounded-md border">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                disabled={qty <= 1}
                className="p-2.5 transition-opacity disabled:opacity-30"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-8 text-center text-sm tabular-nums">{qty}</span>
              <button
                type="button"
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
              disabled={stock === 'out'}
              className="flex-1 bg-brand text-brand-foreground hover:bg-brand/90"
            >
              {stock === 'out' ? 'Out of stock' : 'Add to cart'}
            </Button>
          </div>

          {/* Trust strip — the moment of doubt is right after the buy button. */}
          <ul className="grid grid-cols-3 gap-2">
            {ASSURANCES.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex flex-col items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-3 text-center text-xs text-muted-foreground"
              >
                <Icon className="h-4 w-4 text-brand" aria-hidden />
                {label}
              </li>
            ))}
          </ul>

          {/* Tags mean different things per catalog; show them flat rather
              than guessing a taxonomy the way a vertical theme can. */}
          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border px-2 py-0.5 text-xs capitalize text-muted-foreground"
                >
                  {tag.replace(/-/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Reviews ── */}
      <div className={cn(layout.container, 'mt-14')}>
        <Separator />
        <div id="reviews" className="max-w-3xl scroll-mt-24 py-12">
          <ProductReviews productId={product.id} />
        </div>
        <Separator />
      </div>

      {/* ── Related ── */}
      {related && related.length > 0 && (
        <ProductRail title="You may also like" products={related} />
      )}
    </div>
  );
}
