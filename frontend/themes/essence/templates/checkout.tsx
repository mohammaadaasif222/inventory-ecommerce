'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Check, Gift, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/store/cart-store';
import { useAuthStore } from '@/store/auth-store';
import { useCouponStore } from '@/store/coupon-store';
import {
  useCreateOrder,
  useInitiatePayment,
  useShippingRates,
  type AddressInput,
  type RateQuote,
} from '@/hooks/use-checkout';
import { useLayout, useTheme } from '@/themes/runtime/theme-runtime';
import { formatPrice } from '@/components/storefront/product-card';
import { rememberGuestToken } from '@/lib/guest-order';
import type { CheckoutTemplateProps } from '@/themes/contract';

type Provider = 'COD' | 'STRIPE' | 'RAZORPAY';

/** Shape check only — the server re-validates with class-validator's rules. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Essence checkout — one column, one breath.
 *
 * The theme declares `style: "single-column"` and this is that promise kept:
 * address, delivery, an upsell moment and payment flow down a single centred
 * page rather than a stepper. The *rules* are identical to base — same rate
 * quote, same server-side coupon math, same order/payment mutations — because
 * checkout rules are core, not theme.
 *
 * The upsell writes order `notes` rather than inventing SKUs: gift-wrapping
 * and sample preferences are fulfilment instructions, and the notes field is
 * where staff already look for those.
 */
export default function CheckoutTemplate(_props: CheckoutTemplateProps) {
  const router = useRouter();
  const layout = useLayout();
  const { checkout, name: themeName } = useTheme();
  const user = useAuthStore((s) => s.user);
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const applied = useCouponStore((s) => s.applied);
  const clearCoupon = useCouponStore((s) => s.clear);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const currency = items[0]?.currency ?? 'INR';

  const [address, setAddress] = useState<AddressInput | null>(null);
  const [rate, setRate] = useState<RateQuote | null>(null);
  const [provider, setProvider] = useState<Provider>('COD');
  const [giftWrap, setGiftWrap] = useState(false);
  const [samples, setSamples] = useState(false);
  const [giftNote, setGiftNote] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  const rates = useShippingRates();
  const createOrder = useCreateOrder();
  const initiate = useInitiatePayment();

  const { register, handleSubmit } = useForm<AddressInput>({
    defaultValues: { country: 'IN' },
  });

  if (items.length === 0) {
    return (
      <div
        className={cn(
          layout.container,
          'flex flex-col items-center gap-4 py-24 text-center',
        )}
      >
        <h1 className="font-display text-2xl font-medium">
          There is nothing to check out
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Your bag is empty. The collection is waiting.
        </p>
        <Button onClick={() => router.push('/products')}>
          Enter the collection
        </Button>
      </div>
    );
  }

  const confirmAddress = handleSubmit((values) => {
    // A guest's email is where the confirmation and order link go — without
    // it the order would be unreachable the moment this tab closes.
    if (!user && !EMAIL_RE.test(guestEmail.trim())) {
      toast.error('Enter a valid email for your order confirmation');
      return;
    }
    setAddress(values);
    rates.mutate(
      { country: values.country, orderTotal: subtotal },
      {
        onSuccess: (quotes) => setRate(quotes[0] ?? null),
        onError: (e: Error) => toast.error(e.message),
      },
    );
  });

  const placeOrder = () => {
    if (!address) return;

    // Fulfilment instructions travel as order notes — see the header comment.
    const instructions = [
      giftWrap ? 'Gift wrap requested.' : null,
      samples ? 'Include sample vials if available.' : null,
      giftNote.trim() ? `Gift note: "${giftNote.trim()}"` : null,
    ]
      .filter(Boolean)
      .join(' ');

    createOrder.mutate(
      {
        items: items.map((i) => ({ sku: i.sku, quantity: i.quantity })),
        shippingAddress: address,
        shippingTotal: rate?.cost ?? 0,
        couponCode: applied?.code,
        notes: instructions || undefined,
        guestEmail: user ? undefined : guestEmail.trim(),
      },
      {
        onSuccess: (order) => {
          // The token exists only in this response — keep it before any
          // navigation, or the guest loses their way back to the order.
          if (order.guestToken) rememberGuestToken(order.id, order.guestToken);
          initiate.mutate(
            {
              orderId: order.id,
              provider,
              guestToken: order.guestToken ?? undefined,
            },
            {
              onSuccess: (res) => {
                if (provider === 'COD') {
                  toast.success('Order placed — pay on delivery');
                } else {
                  toast.success(
                    `Order created. Complete payment via ${res.checkout.provider}.`,
                  );
                }
                clear();
                clearCoupon();
                router.push(`/orders/${order.id}`);
              },
              onError: (e: Error) => toast.error(e.message),
            },
          );
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  const shippingCost = rate?.cost ?? 0;
  // Preview only — the server recomputes the discount from the code on POST.
  const discount = applied
    ? Math.min(
        applied.type === 'FREE_SHIPPING' ? shippingCost : applied.discount,
        subtotal + shippingCost,
      )
    : 0;
  const grandTotal = Math.max(0, subtotal + shippingCost - discount);
  const placing = createOrder.isPending || initiate.isPending;
  const addressConfirmed = address !== null && !rates.isPending;

  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <header className="mb-10 text-center">
        <p className="text-[11px] uppercase tracking-[0.35em] text-brand">
          {themeName}
        </p>
        <h1 className="mt-2 font-display text-3xl font-medium">Checkout</h1>
      </header>

      <div className="space-y-10">
        {/* ── Delivery address ── */}
        <section aria-labelledby="co-address">
          <SectionHeading id="co-address" n={1} done={addressConfirmed}>
            Where it should arrive
          </SectionHeading>
          {!user && (
            <div className="mt-5 space-y-1.5 border-b pb-5">
              <Label htmlFor="guest-email">Email for your order</Label>
              <Input
                id="guest-email"
                type="email"
                autoComplete="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <p className="text-xs text-muted-foreground">
                You are checking out as a guest — the confirmation and your
                order link arrive here.{' '}
                <Link
                  href="/login?redirect=/checkout"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  Sign in instead
                </Link>
              </p>
            </div>
          )}
          <form onSubmit={confirmAddress} className="mt-5 grid gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <Input {...register('fullName', { required: true })} />
            </Field>
            <Field label="Phone">
              <Input {...register('phone', { required: true })} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Address line 1">
                <Input {...register('line1', { required: true })} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Address line 2 (optional)">
                <Input {...register('line2')} />
              </Field>
            </div>
            <Field label="City">
              <Input {...register('city', { required: true })} />
            </Field>
            <Field label="State">
              <Input {...register('state', { required: true })} />
            </Field>
            <Field label="Postal code">
              <Input {...register('postalCode', { required: true })} />
            </Field>
            <Field label="Country">
              <Input {...register('country', { required: true })} maxLength={2} />
            </Field>
            <div className="sm:col-span-2">
              <Button
                type="submit"
                variant={addressConfirmed ? 'outline' : 'default'}
                className="w-full"
                disabled={rates.isPending}
              >
                {rates.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {addressConfirmed ? 'Update address' : 'Confirm address'}
              </Button>
            </div>
          </form>
        </section>

        {/* ── Delivery method — appears once the address is priced ── */}
        {addressConfirmed && (
          <section aria-labelledby="co-shipping">
            <SectionHeading id="co-shipping" n={2} done={rate !== null}>
              How it should travel
            </SectionHeading>
            <div className="mt-5 space-y-3">
              {rates.data && rates.data.length > 0 ? (
                rates.data.map((q) => (
                  <label
                    key={q.methodId}
                    className={cn(
                      'flex cursor-pointer items-center justify-between border p-3.5 transition-colors',
                      rate?.methodId === q.methodId
                        ? 'border-brand'
                        : 'hover:border-foreground/40',
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium">{q.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {q.carrier} · ~{q.estimatedDays} days
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        {q.free ? 'Free' : formatPrice(q.cost, currency)}
                      </span>
                      <input
                        type="radio"
                        name="shipping"
                        checked={rate?.methodId === q.methodId}
                        onChange={() => setRate(q)}
                      />
                    </div>
                  </label>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No shipping methods configured for this region — proceeding
                  with free shipping.
                </p>
              )}
            </div>
          </section>
        )}

        {/* ── The finishing touches — the theme's upsell moment ── */}
        {addressConfirmed && checkout.upsell && (
          <section aria-labelledby="co-touches">
            <SectionHeading id="co-touches" n={3} done={giftWrap || samples}>
              The finishing touches
            </SectionHeading>
            <div className="mt-5 space-y-3">
              <UpsellToggle
                checked={giftWrap}
                onChange={setGiftWrap}
                title="Gift wrapping"
                body="Wrapped in the house paper, sealed, no prices enclosed."
              />
              <UpsellToggle
                checked={samples}
                onChange={setSamples}
                title="Sample vials"
                body="A few neighbouring scents from the collection, while stocks allow."
              />
              {giftWrap && (
                <Field label="Gift note (optional)">
                  <Input
                    value={giftNote}
                    onChange={(e) => setGiftNote(e.target.value)}
                    maxLength={140}
                    placeholder="A line to enclose with the parcel"
                  />
                </Field>
              )}
            </div>
          </section>
        )}

        {/* ── Payment ── */}
        {addressConfirmed && (
          <section aria-labelledby="co-payment">
            <SectionHeading id="co-payment" n={checkout.upsell ? 4 : 3} done={false}>
              How you would like to pay
            </SectionHeading>
            <div className="mt-5 space-y-3">
              {(['COD', 'RAZORPAY', 'STRIPE'] as Provider[]).map((p) => (
                <label
                  key={p}
                  className={cn(
                    'flex cursor-pointer items-center justify-between border p-3.5 transition-colors',
                    provider === p ? 'border-brand' : 'hover:border-foreground/40',
                  )}
                >
                  <span className="text-sm font-medium">
                    {p === 'COD'
                      ? 'Cash on delivery'
                      : p === 'RAZORPAY'
                        ? 'Razorpay'
                        : 'Stripe'}
                  </span>
                  <input
                    type="radio"
                    name="payment"
                    checked={provider === p}
                    onChange={() => setProvider(p)}
                  />
                </label>
              ))}
            </div>
          </section>
        )}

        <Separator />

        {/* ── Summary + place order ── */}
        <section aria-label="Order summary" className="space-y-2 text-sm">
          {items.map((i) => (
            <div key={i.sku} className="flex justify-between">
              <span className="truncate text-muted-foreground">
                {i.name} × {i.quantity}
              </span>
              <span>{formatPrice(i.price * i.quantity, currency)}</span>
            </div>
          ))}
          <div className="border-t pt-2" />
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>{formatPrice(shippingCost, currency)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-700">
              <span>Discount ({applied?.code})</span>
              <span>−{formatPrice(discount, currency)}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t pt-3">
            <span className="font-medium">Total</span>
            <span className="font-display text-2xl font-medium">
              {formatPrice(grandTotal, currency)}
            </span>
          </div>

          <Button
            size="lg"
            className="mt-4 w-full"
            onClick={placeOrder}
            disabled={!addressConfirmed || placing}
          >
            {placing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {addressConfirmed ? 'Place the order' : 'Confirm your address first'}
          </Button>

          {/* Declared per theme, so each shop reassures in its own words. */}
          {checkout.trustBadges.length > 0 && (
            <ul className="space-y-1.5 pt-4">
              {checkout.trustBadges.map((badge) => (
                <li
                  key={badge}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <Check className="h-3 w-3 shrink-0 text-brand" aria-hidden />
                  {badge}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function SectionHeading({
  id,
  n,
  done,
  children,
}: {
  id: string;
  n: number;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <h2 id={id} className="flex items-center gap-3">
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs',
          done
            ? 'border-brand bg-brand text-brand-foreground'
            : 'border-border text-muted-foreground',
        )}
        aria-hidden
      >
        {done ? <Check className="h-3.5 w-3.5" /> : n}
      </span>
      <span className="font-display text-xl font-medium">{children}</span>
    </h2>
  );
}

function UpsellToggle({
  checked,
  onChange,
  title,
  body,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  body: string;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 border p-3.5 transition-colors',
        checked ? 'border-brand' : 'hover:border-foreground/40',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <span className="flex-1">
        <span className="flex items-center gap-2 text-sm font-medium">
          <Gift className="h-3.5 w-3.5 text-brand" aria-hidden />
          {title}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{body}</span>
      </span>
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
