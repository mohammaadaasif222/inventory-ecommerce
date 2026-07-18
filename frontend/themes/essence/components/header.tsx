'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ChevronDown,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/storefront/mode-toggle';
import { formatPrice } from '@/components/storefront/product-card';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';
import { useOffers } from '@/hooks/use-coupons';
import { useCategories } from '@/hooks/use-storefront';
import { useLayout, useTheme } from '@/themes/runtime/theme-runtime';
import { cn } from '@/lib/utils';
import { FREE_SHIPPING_THRESHOLD, OPEN_CART_EVENT, openCartDrawer } from '../lib';

/**
 * Essence header — logo left, centred store links, bag and account right.
 *
 * Also owns the slide-out "Review Your Cart" drawer and the floating cart
 * button: they are one piece of UI with one open/close state, so they live in
 * the one slot the layout always renders.
 */
export default function EssenceHeader() {
  const layout = useLayout();
  const { name: brandName, logoUrl } = useTheme();
  const user = useAuthStore((s) => s.user);
  const items = useCartStore((s) => s.items);
  const { data: categories } = useCategories();
  const [cartOpen, setCartOpen] = useState(false);

  const cartCount = items.reduce((n, i) => n + i.quantity, 0);
  const topCategories = (categories ?? []).slice(0, 3);

  // Add-to-cart actions anywhere on the page open the drawer via this event.
  useEffect(() => {
    const open = () => setCartOpen(true);
    window.addEventListener(OPEN_CART_EVENT, open);
    return () => window.removeEventListener(OPEN_CART_EVENT, open);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-md">
        <div className={cn(layout.container, 'flex h-16 items-center justify-between gap-4')}>
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-xl font-semibold uppercase tracking-[0.18em] transition-opacity hover:opacity-70"
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={brandName} className="h-8 w-auto object-contain" />
            ) : (
              <>
                <Sparkles className="h-5 w-5 text-brand" aria-hidden />
                {brandName}
              </>
            )}
          </Link>

          <nav
            aria-label="Store"
            className="hidden items-center gap-7 text-sm font-medium md:flex"
          >
            <Link href="/products" className="transition-colors hover:text-brand">
              All Products
            </Link>
            {topCategories.map((c) => (
              <Link
                key={c.id}
                href={`/products?categoryId=${c.id}`}
                className="transition-colors hover:text-brand"
              >
                {c.name}
              </Link>
            ))}
            <Link href="/about" className="transition-colors hover:text-brand">
              About
            </Link>
            <Link href="/contact" className="transition-colors hover:text-brand">
              Contact
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label={`Open cart, ${cartCount} items`}
              className="relative transition-colors hover:text-brand"
            >
              <ShoppingBag className="h-5 w-5" />
              <CountPop
                count={cartCount}
                className="absolute -right-2 -top-2 bg-brand text-[10px] text-brand-foreground"
              />
            </button>
            <Link
              href={user ? '/account' : '/login'}
              aria-label={user ? 'Account' : 'Sign in'}
              className="transition-colors hover:text-brand"
            >
              <User className="h-5 w-5" />
            </Link>
            <ModeToggle />
          </div>
        </div>
      </header>

      <OffersTicker />
      <FloatingCartButton count={cartCount} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}

/** Count pill that pops with a spring whenever the number changes. */
function CountPop({ count, className }: { count: number; className?: string }) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key={count}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.4, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 24 }}
          className={cn(
            'flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-semibold',
            className,
          )}
        >
          {count}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/**
 * The running banner — live offers and store perks on a continuous marquee.
 *
 * Sits under the sticky navbar and scrolls away with the page. The track holds
 * the items twice so the -50% translate loops seamlessly; it pauses on hover
 * and holds still entirely for reduced-motion visitors.
 */
function OffersTicker() {
  const { data: offers } = useOffers();

  const offerLines = (offers ?? []).slice(0, 4).map((o) => {
    const headline =
      o.type === 'PERCENT'
        ? `${o.value}% off`
        : o.type === 'FIXED'
          ? `₹${o.value} off`
          : 'Free shipping';
    return `${headline} with code ${o.code}`;
  });

  const items = [
    ...offerLines,
    `Free shipping over ${formatPrice(FREE_SHIPPING_THRESHOLD + 1, 'INR')}`,
    '30-day easy returns',
    'Authenticity guaranteed',
    'Secure payments',
  ];

  return (
    <div
      className="overflow-hidden bg-ink py-2 text-background"
      aria-label="Offers and store perks"
    >
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:animate-none">
        {[0, 1].map((copy) => (
          <div
            key={copy}
            aria-hidden={copy === 1}
            className="flex shrink-0 items-center"
          >
            {items.map((item) => (
              <span
                key={item}
                className="flex items-center gap-8 pr-8 text-[11px] font-medium uppercase tracking-[0.2em]"
              >
                {item}
                <Sparkles className="h-3 w-3 text-brand" aria-hidden />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Teal round button, bottom-right, clear of the chat bubble at right-5. */
function FloatingCartButton({ count }: { count: number }) {
  return (
    <button
      type="button"
      onClick={openCartDrawer}
      aria-label={`Open cart, ${count} items`}
      className="fixed bottom-5 right-24 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
    >
      <ShoppingCart className="h-6 w-6" />
      <CountPop
        count={count}
        className="absolute -top-1 left-0 h-5 min-w-5 bg-background text-[11px] text-foreground shadow"
      />
    </button>
  );
}

function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const [couponOpen, setCouponOpen] = useState(false);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const currency = items[0]?.currency ?? 'INR';
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50"
            aria-hidden
          />
          <motion.aside
            role="dialog"
            aria-label="Review your cart"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background shadow-2xl"
          >
            {/* Free-shipping meter */}
            <div className="bg-secondary px-5 py-3 text-center text-sm text-secondary-foreground">
              {remaining > 0 ? (
                <>
                  You&apos;re{' '}
                  <span className="font-semibold text-brand">
                    {formatPrice(remaining, currency)}
                  </span>{' '}
                  away from free shipping!
                </>
              ) : (
                <>You&apos;ve unlocked free shipping!</>
              )}
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-background/60">
                <div
                  className="h-full bg-brand transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Title row */}
            <div className="flex items-center gap-3 border-b px-5 py-4">
              <button type="button" onClick={onClose} aria-label="Close cart">
                <ArrowRight className="h-5 w-5" />
              </button>
              <h2 className="flex-1 text-center font-display text-xl font-semibold">
                Review Your Cart
              </h2>
              <span className="flex h-6 min-w-6 items-center justify-center rounded bg-muted px-1.5 text-sm font-medium">
                {count}
              </span>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <ShoppingBag className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Your cart is empty.</p>
                  <Button asChild size="sm" onClick={onClose}>
                    <Link href="/products">Continue shopping</Link>
                  </Button>
                </div>
              ) : (
                <ul className="space-y-5">
                  {items.map((item) => (
                    <li key={item.sku} className="flex items-start gap-3">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-muted">
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-brand">{item.name}</p>
                        <p className="text-sm">{formatPrice(item.price, item.currency)}</p>
                        <button
                          type="button"
                          onClick={() => remove(item.sku)}
                          className="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-destructive"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="flex flex-col items-center rounded border">
                        <button
                          type="button"
                          onClick={() => setQty(item.sku, item.quantity + 1)}
                          aria-label="Increase quantity"
                          className="p-1.5 transition-colors hover:bg-muted"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-8 border-y py-0.5 text-center text-sm tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(item.sku, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          aria-label="Decrease quantity"
                          className="p-1.5 transition-colors hover:bg-muted disabled:opacity-30"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Summary */}
            {items.length > 0 && (
              <div className="border-t px-5 py-4">
                <button
                  type="button"
                  onClick={() => setCouponOpen((v) => !v)}
                  aria-expanded={couponOpen}
                  className="flex w-full items-center justify-between py-1 text-sm font-medium"
                >
                  Got a Discount Code?
                  <ChevronDown
                    className={cn('h-4 w-4 transition-transform', couponOpen && 'rotate-180')}
                  />
                </button>
                {couponOpen && (
                  <p className="pb-2 text-xs text-muted-foreground">
                    Apply your code on the checkout page — it is validated against
                    your order there.
                  </p>
                )}

                <div className="mt-2 space-y-1 border-t pt-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">Subtotal</span>
                    <span>{formatPrice(subtotal, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span>Total</span>
                    <span>{formatPrice(subtotal, currency)}</span>
                  </div>
                </div>

                <Button asChild size="lg" className="mt-4 w-full" onClick={onClose}>
                  <Link href="/checkout">
                    Proceed to Checkout <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Link
                  href="/cart"
                  onClick={onClose}
                  className="mt-2 block text-center text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  View full cart
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-4 top-[4.5rem] rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
