'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Loader2, Minus, Plus, Rotate3d } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/ui/star-rating';
import { ProductCard, WishlistButton, formatPrice } from '@/components/storefront/product-card';
import { ProductReviews } from '@/components/storefront/product-reviews';
import { Product3DViewer } from '@/components/storefront/product-3d-viewer';
import { Reveal, RevealGroup, RevealItem } from '@/components/storefront/motion';
import { useViewerConfig, viewerIsActive } from '@/hooks/use-viewer-config';
import { useLayout } from '@/themes/runtime/theme-runtime';
import {
  useCategories,
  useProductBySlug,
  useRelatedProducts,
  type Category,
} from '@/hooks/use-storefront';
import { useCartStore } from '@/store/cart-store';
import { cn } from '@/lib/utils';
import type { ProductTemplateProps } from '@/themes/contract';
import { FREE_SHIPPING_THRESHOLD, PAYMENT_BADGES, openCartDrawer } from '../lib';

const EASE = [0.22, 1, 0.36, 1] as const;

type Tab = 'description' | 'reviews';

/** Walk the category tree for the product's category. */
function findCategory(nodes: Category[] | undefined, id: string | null): Category | null {
  if (!nodes || !id) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    const hit = findCategory(node.children, id);
    if (hit) return hit;
  }
  return null;
}

/**
 * Essence product page — the boutique layout: breadcrumb and category links
 * over the title, price with the free-shipping note, quantity beside a teal
 * Add To Cart, a guaranteed-safe-checkout box, Description/Reviews tabs and a
 * related-products grid. Adding to cart slides the header's drawer open.
 */
export default function ProductTemplate({ slug }: ProductTemplateProps) {
  const reduced = useReducedMotion();
  const layout = useLayout();
  const { data: product, isLoading } = useProductBySlug(slug);
  const { data: related } = useRelatedProducts(product?.id, 4);
  const { data: categories } = useCategories();
  const { data: viewerConfig } = useViewerConfig(product?.id);

  const [active, setActive] = useState(0);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<Tab>('description');
  // The 3D/360 widget leads when configured; tapping a photo thumb leaves it.
  const [showViewer, setShowViewer] = useState(true);

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
        <p className="font-display text-2xl">Product not found</p>
        <Button asChild variant="link">
          <Link href="/products">Back to all products</Link>
        </Button>
      </div>
    );
  }

  const images = product.images ?? [];
  const variants = product.variants ?? [];
  const variant = variants.find((v) => v.id === variantId);
  const price = variant?.price ?? product.basePrice;
  const category = findCategory(categories, product.categoryId);
  const freeShipping = price >= FREE_SHIPPING_THRESHOLD;

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
    openCartDrawer();
  };

  return (
    <div className="bg-muted/40 py-8">
      <div className={cn(layout.container, 'max-w-6xl')}>
        <div className="rounded-[var(--radius)] bg-card p-5 shadow-sm sm:p-10">
          <div className="grid gap-10 lg:grid-cols-2">
            {/* ── Gallery ── */}
            <div>
              {(() => {
                const hasViewer = viewerIsActive(viewerConfig);
                const viewerShowing = hasViewer && showViewer;
                return (
                  <>
                    <div className="relative aspect-square overflow-hidden bg-muted">
                      {viewerShowing ? (
                        <Product3DViewer
                          config={viewerConfig!}
                          fallbackImage={images[0]?.url}
                          alt={product.name}
                        />
                      ) : (
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
                              transition={{ duration: reduced ? 0 : 0.4, ease: EASE }}
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                          ) : null}
                        </AnimatePresence>
                      )}
                    </div>
                    {(images.length > 1 || hasViewer) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {hasViewer && (
                          <button
                            onClick={() => setShowViewer(true)}
                            aria-label="Interactive 3D view"
                            aria-current={viewerShowing}
                            className={cn(
                              'flex h-14 w-14 items-center justify-center border bg-secondary text-secondary-foreground transition-opacity',
                              viewerShowing
                                ? 'border-brand'
                                : 'border-transparent opacity-60 hover:opacity-100',
                            )}
                          >
                            <Rotate3d className="h-6 w-6" />
                          </button>
                        )}
                        {images.map((img, i) => (
                          <button
                            key={img.storageId}
                            onClick={() => {
                              setActive(i);
                              setShowViewer(false);
                            }}
                            aria-label={`View image ${i + 1}`}
                            aria-current={!viewerShowing && i === active}
                            className={cn(
                              'h-14 w-14 overflow-hidden border transition-opacity',
                              !viewerShowing && i === active
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
                  </>
                );
              })()}
            </div>

            {/* ── Details ── */}
            <Reveal className="flex flex-col gap-4">
              <nav
                aria-label="Breadcrumb"
                className="text-xs text-muted-foreground"
              >
                <Link href="/" className="transition-colors hover:text-foreground">
                  Home
                </Link>
                {' / '}
                {category ? (
                  <>
                    <Link
                      href={`/products?categoryId=${category.id}`}
                      className="transition-colors hover:text-foreground"
                    >
                      {category.name}
                    </Link>
                    {' / '}
                  </>
                ) : null}
                <span className="text-foreground">{product.name}</span>
              </nav>

              <p className="text-sm">
                <Link href="/products" className="text-brand hover:underline">
                  All Products
                </Link>
                {category ? (
                  <>
                    {', '}
                    <Link
                      href={`/products?categoryId=${category.id}`}
                      className="text-brand hover:underline"
                    >
                      {category.name}
                    </Link>
                  </>
                ) : null}
              </p>

              <div className="flex items-start justify-between gap-4">
                <h1 className="font-display text-3xl font-medium leading-tight sm:text-4xl">
                  {product.name}
                </h1>
                <WishlistButton productId={product.id} className="mt-1 shrink-0 border" />
              </div>

              <p className="flex items-baseline gap-2">
                <span className="font-display text-3xl font-semibold">
                  {formatPrice(price, product.currency)}
                </span>
                {freeShipping && (
                  <span className="text-sm text-muted-foreground">&amp; Free Shipping</span>
                )}
              </p>

              {product.ratingCount > 0 && (
                <a
                  href="#reviews"
                  onClick={() => setTab('reviews')}
                  className="flex w-fit items-center gap-2 text-sm transition-opacity hover:opacity-70"
                >
                  <StarRating value={product.ratingAverage} />
                  <span className="text-muted-foreground underline underline-offset-4">
                    {product.ratingCount}{' '}
                    {product.ratingCount === 1 ? 'review' : 'reviews'}
                  </span>
                </a>
              )}

              {product.description ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {product.description}
                </p>
              ) : null}

              {variants.length > 1 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">
                    Options
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
                            'rounded-[var(--radius)] border px-4 py-2 text-sm transition-all',
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

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="flex items-center rounded-[var(--radius)] border">
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
                  {variants.length === 0 ? 'Unavailable' : 'Add To Cart'}
                </Button>
              </div>

              {category ? (
                <p className="border-t pt-4 text-sm text-muted-foreground">
                  Categories:{' '}
                  <Link
                    href={`/products?categoryId=${category.id}`}
                    className="text-brand hover:underline"
                  >
                    {category.name}
                  </Link>
                </p>
              ) : null}

              <fieldset className="rounded-[var(--radius)] border px-4 pb-4 text-center">
                <legend className="mx-auto px-3 text-sm font-semibold">
                  Guaranteed Safe Checkout
                </legend>
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                  {PAYMENT_BADGES.map((badge) => (
                    <span
                      key={badge}
                      className="rounded-sm border bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wide"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              </fieldset>
            </Reveal>
          </div>

          {/* ── Tabs ── */}
          <div className="mt-12">
            <div role="tablist" aria-label="Product details" className="flex gap-6 border-b">
              {(
                [
                  ['description', 'Description'],
                  ['reviews', `Reviews (${product.ratingCount})`],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={cn(
                    '-mb-px border-b-2 pb-2.5 text-sm font-medium transition-colors',
                    tab === id
                      ? 'border-brand text-brand'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div role="tabpanel" id="reviews" className="scroll-mt-24 pt-5">
              {tab === 'description' ? (
                <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
                  {product.description ||
                    'No further details for this product yet.'}
                </p>
              ) : (
                <div className="max-w-3xl">
                  <ProductReviews productId={product.id} />
                </div>
              )}
            </div>
          </div>

          {/* ── Related ── */}
          {related && related.length > 0 && (
            <div className="mt-14">
              <h2 className="mb-8 font-display text-3xl font-medium">Related products</h2>
              <RevealGroup className={cn('grid', layout.grid, layout.gridGap)}>
                {related.slice(0, 4).map((p) => (
                  <RevealItem key={p.id}>
                    <ProductCard product={p} />
                  </RevealItem>
                ))}
              </RevealGroup>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
