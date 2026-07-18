'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronRight, Loader2, Minus, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { StarRating } from '@/components/ui/star-rating';
import { ProductRail } from '@/components/storefront/product-rail';
import { ProductReviews } from '@/components/storefront/product-reviews';
import { WishlistButton, formatPrice } from '@/components/storefront/product-card';
import { Reveal } from '@/components/storefront/motion';
import { useLayout, useTheme } from '@/themes/runtime/theme-runtime';
import { useProductBySlug, useRelatedProducts } from '@/hooks/use-storefront';
import { useCartStore } from '@/store/cart-store';
import { cn } from '@/lib/utils';
import type { ProductTemplateProps } from '@/themes/contract';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Same attribute/note split as base — see the comment there. */
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

type WearTab = 'scent' | 'wear' | 'ritual';

/**
 * Essence product page — a fragrance presented as a composition.
 *
 * Structurally different from base, not just re-toned: the notes render as a
 * top/heart/base pyramid, the variant selector speaks in concentrations, and
 * the description lives in "how it wears" tabs. Data flow (fetch, variant
 * choice, add-to-cart) is identical to base's — only the telling changes.
 */
export default function ProductTemplate({ slug }: ProductTemplateProps) {
  const reduced = useReducedMotion();
  const layout = useLayout();
  const { name: themeName } = useTheme();
  const { data: product, isLoading } = useProductBySlug(slug);
  const { data: related } = useRelatedProducts(product?.id, 8);

  const [active, setActive] = useState(0);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<WearTab>('scent');

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
  const tags = product.tags ?? [];
  const notes = tags.filter((t) => !ATTRIBUTE_TAGS.has(t));
  const attributes = tags.filter((t) => ATTRIBUTE_TAGS.has(t));

  const addToCart = () => {
    // Orders are placed per variant SKU; require/auto-pick one.
    const chosen = variant ?? (variants.length === 1 ? variants[0] : null);
    if (!chosen) {
      toast.error('Please choose a concentration first');
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
      <nav
        aria-label="Breadcrumb"
        className={cn(
          layout.container,
          'flex items-center gap-1.5 py-5 text-xs text-muted-foreground',
        )}
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

      <div className={cn(layout.container, 'grid gap-12 lg:grid-cols-2 lg:gap-20')}>
        {/* ── Gallery — single tall frame, thumbnails beneath ── */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="relative aspect-[4/5] overflow-hidden bg-muted">
            <AnimatePresence mode="wait">
              {images[active] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <motion.img
                  key={images[active].storageId}
                  src={images[active].url}
                  alt={product.name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduced ? 0 : 0.6, ease: EASE }}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
            </AnimatePresence>
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((img, i) => (
                <button
                  key={img.storageId}
                  onClick={() => setActive(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-current={i === active}
                  className={cn(
                    'h-14 w-14 overflow-hidden border transition-opacity',
                    i === active
                      ? 'border-brand'
                      : 'border-transparent opacity-50 hover:opacity-100',
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Details ── */}
        <Reveal className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.35em] text-brand">
                {themeName}
              </p>
              <h1 className="font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
                {product.name}
              </h1>
            </div>
            <WishlistButton productId={product.id} className="mt-1 shrink-0 border" />
          </div>

          {product.ratingCount > 0 ? (
            <a
              href="#reviews"
              className="flex w-fit items-center gap-2 text-sm transition-opacity hover:opacity-70"
            >
              <StarRating value={product.ratingAverage} />
              <span className="font-medium">{product.ratingAverage.toFixed(1)}</span>
              <span className="text-muted-foreground underline underline-offset-4">
                {product.ratingCount}{' '}
                {product.ratingCount === 1 ? 'review' : 'reviews'}
              </span>
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">
              Not yet reviewed — wear it first
            </p>
          )}

          <p className="font-display text-3xl font-medium">
            {formatPrice(price, product.currency)}
          </p>

          {notes.length > 0 && <NotesPyramid notes={notes} />}

          <Separator />

          {/* Concentration & size */}
          {variants.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Concentration &amp; size
              </p>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => {
                  const label = Object.values(v.attributes).join(' · ') || v.sku;
                  const selected = v.id === variantId;
                  return (
                    <button
                      key={v.id}
                      onClick={() => setVariantId(v.id)}
                      aria-pressed={selected}
                      className={cn(
                        'border px-4 py-2 text-sm transition-all',
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
                              ? 'text-brand-foreground/70'
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

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center border">
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
              className="flex-1 sm:flex-none sm:px-12"
            >
              {variants.length === 0 ? 'Unavailable' : 'Add to bag'}
            </Button>
          </div>

          {/* How it wears */}
          <div className="pt-2">
            <div role="tablist" aria-label="About this fragrance" className="flex gap-6 border-b">
              {(
                [
                  ['scent', 'The scent'],
                  ['wear', 'How it wears'],
                  ['ritual', 'The ritual'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={cn(
                    '-mb-px border-b-2 pb-2 text-sm transition-colors',
                    tab === id
                      ? 'border-brand text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div role="tabpanel" className="pt-4 text-sm leading-relaxed text-muted-foreground">
              {tab === 'scent' &&
                (product.description ? (
                  <p className="max-w-prose">{product.description}</p>
                ) : (
                  <p>
                    A composition from the {themeName} collection. The notes
                    above tell its arc — top to base.
                  </p>
                ))}

              {tab === 'wear' && (
                <div className="space-y-3">
                  {attributes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {attributes.map((tag) => (
                        <span
                          key={tag}
                          className="border px-2 py-0.5 text-[10px] uppercase tracking-wider"
                        >
                          {prettify(tag)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <p className="max-w-prose">
                    Concentration decides projection: an eau de toilette sits
                    close and bright, an eau de parfum carries further and
                    deeper, an attar or oil wears closest and longest. Choose by
                    the room you will be in.
                  </p>
                </div>
              )}

              {tab === 'ritual' && (
                <p className="max-w-prose">
                  Apply to pulse points — wrists, neck, behind the ears — on
                  skin still warm from a shower, and let it dry without rubbing.
                  Rubbing crushes the top notes and skips the opening act.
                </p>
              )}
            </div>
          </div>
        </Reveal>
      </div>

      {/* ── Reviews ── */}
      <div className={cn(layout.container, 'mt-20')}>
        <Separator />
        <div id="reviews" className="max-w-3xl scroll-mt-24 py-14">
          <ProductReviews productId={product.id} />
        </div>
        <Separator />
      </div>

      {/* ── Related ── */}
      {related && related.length > 0 && (
        <ProductRail
          title="If you like this, try…"
          subtitle="Neighbouring compositions from the same family"
          products={related}
        />
      )}
    </div>
  );
}

/**
 * The scent pyramid.
 *
 * Tags carry no top/heart/base labels, so the split relies on a real authoring
 * convention: the admin orders a product's note tags from opening to drydown,
 * and this renders them in thirds. Wrong order is a content fix in the product
 * form, not a code change.
 */
function NotesPyramid({ notes }: { notes: string[] }) {
  const third = Math.ceil(notes.length / 3);
  const tiers = [
    { label: 'Top', items: notes.slice(0, third), width: 'w-full' },
    { label: 'Heart', items: notes.slice(third, third * 2), width: 'w-3/4' },
    { label: 'Base', items: notes.slice(third * 2), width: 'w-1/2' },
  ].filter((t) => t.items.length > 0);

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        The composition
      </p>
      <div className="space-y-2">
        {tiers.map((tier) => (
          <div
            key={tier.label}
            className={cn(
              'mx-auto border-b border-border pb-2 text-center',
              tier.width,
            )}
          >
            <span className="mr-3 text-[10px] uppercase tracking-[0.25em] text-brand">
              {tier.label}
            </span>
            <span className="font-display text-lg capitalize">
              {tier.items.map(prettify).join(' · ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
