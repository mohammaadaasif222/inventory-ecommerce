'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import { rememberGuestToken } from '@/lib/guest-order';
import type { CheckoutTemplateProps } from '@/themes/contract';

const STEPS = ['Address', 'Shipping', 'Payment'] as const;
type Provider = 'COD' | 'STRIPE' | 'RAZORPAY';

/** Shape check only — the server re-validates with class-validator's rules. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CheckoutTemplate(_props: CheckoutTemplateProps) {
  const router = useRouter();
  const layout = useLayout();
  const { checkout } = useTheme();
  const user = useAuthStore((s) => s.user);
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const applied = useCouponStore((s) => s.applied);
  const clearCoupon = useCouponStore((s) => s.clear);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const currency = items[0]?.currency ?? 'INR';

  const [step, setStep] = useState(0);
  const [address, setAddress] = useState<AddressInput | null>(null);
  const [rate, setRate] = useState<RateQuote | null>(null);
  const [provider, setProvider] = useState<Provider>('COD');
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
          Your cart is empty. Add something to it and come back.
        </p>
        <Button onClick={() => router.push('/products')}>
          Browse the collection
        </Button>
      </div>
    );
  }

  const submitAddress = handleSubmit((values) => {
    // Guests must leave an email before the flow moves on — it is where the
    // confirmation and the order link go, so without it the order is orphaned.
    if (!user && !EMAIL_RE.test(guestEmail.trim())) {
      toast.error('Enter a valid email for your order confirmation');
      return;
    }
    setAddress(values);
    rates.mutate(
      { country: values.country, orderTotal: subtotal },
      {
        onSuccess: (quotes) => {
          setRate(quotes[0] ?? null);
          setStep(1);
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  });

  const placeOrder = () => {
    if (!address) return;
    createOrder.mutate(
      {
        items: items.map((i) => ({ sku: i.sku, quantity: i.quantity })),
        shippingAddress: address,
        shippingTotal: rate?.cost ?? 0,
        couponCode: applied?.code,
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

  return (
    <div className={cn(layout.container, 'grid gap-8 py-8 lg:grid-cols-3')}>
      <div className="space-y-6 lg:col-span-2">
        {/* Stepper */}
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
                  i <= step
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn('text-sm', i === step && 'font-medium')}>{label}</span>
              {i < STEPS.length - 1 && <div className="h-px w-8 bg-border" />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Shipping address</CardTitle>
            </CardHeader>
            <CardContent>
              {!user && (
                <div className="mb-4 space-y-1.5 border-b pb-4">
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
                    Checking out as a guest — we&apos;ll email your confirmation
                    and order link here.{' '}
                    <Link
                      href="/login?redirect=/checkout"
                      className="underline underline-offset-2 hover:text-foreground"
                    >
                      Sign in instead
                    </Link>
                  </p>
                </div>
              )}
              <form onSubmit={submitAddress} className="grid gap-3 sm:grid-cols-2">
                <Field label="Full name"><Input {...register('fullName', { required: true })} /></Field>
                <Field label="Phone"><Input {...register('phone', { required: true })} /></Field>
                <div className="sm:col-span-2">
                  <Field label="Address line 1"><Input {...register('line1', { required: true })} /></Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Address line 2 (optional)"><Input {...register('line2')} /></Field>
                </div>
                <Field label="City"><Input {...register('city', { required: true })} /></Field>
                <Field label="State"><Input {...register('state', { required: true })} /></Field>
                <Field label="Postal code"><Input {...register('postalCode', { required: true })} /></Field>
                <Field label="Country"><Input {...register('country', { required: true })} maxLength={2} /></Field>
                <div className="sm:col-span-2">
                  <Button type="submit" className="w-full" disabled={rates.isPending}>
                    {rates.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Continue to shipping
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Shipping method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rates.data && rates.data.length > 0 ? (
                rates.data.map((q) => (
                  <label
                    key={q.methodId}
                    className={cn(
                      'flex cursor-pointer items-center justify-between rounded-lg border p-3',
                      rate?.methodId === q.methodId && 'border-primary ring-1 ring-primary',
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
                        {q.free ? 'Free' : `${currency} ${q.cost.toFixed(2)}`}
                      </span>
                      <input
                        type="radio"
                        checked={rate?.methodId === q.methodId}
                        onChange={() => setRate(q)}
                      />
                    </div>
                  </label>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No shipping methods configured for this region — proceeding with free shipping.
                </p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)}>
                  Back
                </Button>
                <Button className="flex-1" onClick={() => setStep(2)}>
                  Continue to payment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(['COD', 'RAZORPAY', 'STRIPE'] as Provider[]).map((p) => (
                <label
                  key={p}
                  className={cn(
                    'flex cursor-pointer items-center justify-between rounded-lg border p-3',
                    provider === p && 'border-primary ring-1 ring-primary',
                  )}
                >
                  <span className="text-sm font-medium">
                    {p === 'COD' ? 'Cash on delivery' : p === 'RAZORPAY' ? 'Razorpay' : 'Stripe'}
                  </span>
                  <input type="radio" checked={provider === p} onChange={() => setProvider(p)} />
                </label>
              ))}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button className="flex-1" onClick={placeOrder} disabled={placing}>
                  {placing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Place order
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Summary */}
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {items.map((i) => (
              <div key={i.sku} className="flex justify-between">
                <span className="truncate text-muted-foreground">
                  {i.name} × {i.quantity}
                </span>
                <span>{(i.price * i.quantity).toFixed(2)}</span>
              </div>
            ))}
            <div className="border-t pt-2" />
            <Row label="Subtotal" value={`${currency} ${subtotal.toFixed(2)}`} />
            <Row label="Shipping" value={`${currency} ${shippingCost.toFixed(2)}`} />
            {discount > 0 && (
              <div className="flex justify-between text-sm text-emerald-700">
                <span>Discount ({applied?.code})</span>
                <span>
                  −{currency} {discount.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total</span>
              <span>
                {currency} {grandTotal.toFixed(2)}
              </span>
            </div>

            {/* Declared per theme, so each shop reassures in its own words. */}
            {checkout.trustBadges.length > 0 && (
              <ul className="space-y-1.5 border-t pt-3">
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
          </CardContent>
        </Card>
      </div>
    </div>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
