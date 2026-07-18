'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CouponBox } from '@/components/storefront/coupon-box';
import { formatPrice } from '@/components/storefront/product-card';
import { useCartStore } from '@/store/cart-store';
import { useCouponStore } from '@/store/coupon-store';
import { useLayout } from '@/themes/runtime/theme-runtime';
import { cn } from '@/lib/utils';

/**
 * Base cart — line items, coupon, totals.
 *
 * Totals shown here are indicative; checkout re-prices against the API before
 * payment, so a stale browser cart can never decide what a customer is charged.
 */
export default function CartTemplate() {
  const router = useRouter();
  const layout = useLayout();
  const items = useCartStore((s) => s.items);
  const setQty = useCartStore((s) => s.setQty);
  const remove = useCartStore((s) => s.remove);
  const applied = useCouponStore((s) => s.applied);
  const clearCoupon = useCouponStore((s) => s.clear);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const currency = items[0]?.currency ?? 'INR';

  // A coupon priced against a different cart is stale — drop it and make the
  // customer re-apply rather than show a discount the server won't honour.
  useEffect(() => {
    if (applied && items.length === 0) clearCoupon();
  }, [applied, items.length, clearCoupon]);

  const discount = applied ? Math.min(applied.discount, subtotal) : 0;
  const total = Math.max(0, subtotal - discount);

  if (items.length === 0) {
    return (
      <div
        className={cn(
          layout.container,
          'flex flex-col items-center gap-4 py-24 text-center',
        )}
      >
        <ShoppingCart className="h-10 w-10 text-muted-foreground" />
        <h1 className="font-display text-2xl font-medium">Your cart is empty</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Nothing here yet. Browse the collection and add something you like.
        </p>
        <Button asChild>
          <Link href="/products">Browse products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(layout.container, 'grid gap-8 py-8 lg:grid-cols-3')}>
      <div className="space-y-3 lg:col-span-2">
        <h1 className="font-display text-2xl font-medium tracking-tight">Cart</h1>
        {items.map((item) => (
          <Card key={item.sku}>
            <CardContent className="flex items-center gap-4 p-3">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-muted">
                {item.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">{item.variantLabel}</p>
                <p className="text-sm">{formatPrice(item.price, item.currency)}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setQty(item.sku, item.quantity - 1)}
                  aria-label={`Decrease quantity of ${item.name}`}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center text-sm">{item.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setQty(item.sku, item.quantity + 1)}
                  aria-label={`Increase quantity of ${item.name}`}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(item.sku)}
                aria-label={`Remove ${item.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <Card>
          <CardContent className="space-y-4 p-6">
            <CouponBox subtotal={subtotal} currency={currency} />

            <Separator />

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatPrice(subtotal, currency)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-700">
                <span>Discount ({applied?.code})</span>
                <span className="font-medium">
                  −{formatPrice(discount, currency)}
                </span>
              </div>
            )}

            <Separator />

            <div className="flex justify-between">
              <span className="font-medium">Total</span>
              <span className="font-display text-xl font-medium">
                {formatPrice(total, currency)}
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              Shipping &amp; taxes calculated at checkout.
            </p>
            <Button className="w-full" onClick={() => router.push('/checkout')}>
              Checkout
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
