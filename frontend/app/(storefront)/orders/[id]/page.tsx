'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Check, Circle } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ShipmentTracker } from '@/components/storefront/shipment-tracker';
import { useAuthStore } from '@/store/auth-store';
import { useGuestOrder, useMyOrder } from '@/hooks/use-account';
import { useOrderShipments } from '@/hooks/use-shipping';
import { recallGuestToken, rememberGuestToken } from '@/lib/guest-order';

const TIMELINE = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

/**
 * A guest's credential for this order, if any: the `?guestToken=` from the
 * confirmation email's link, falling back to the token checkout stashed in
 * sessionStorage. A token in the URL is re-stashed so in-page navigation
 * survives losing the query string.
 *
 * Read from `window.location` in an effect rather than `useSearchParams()`,
 * which would force a Suspense boundary on the whole page for one param.
 */
function useGuestCredential(orderId: string): string | null {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    const fromUrl = new URLSearchParams(window.location.search).get('guestToken');
    if (fromUrl) rememberGuestToken(orderId, fromUrl);
    setToken(fromUrl ?? recallGuestToken(orderId));
  }, [orderId]);

  return token;
}

export default function OrderTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const guestToken = useGuestCredential(id);

  const mine = useMyOrder(id, Boolean(user));
  const guest = useGuestOrder(id, user ? null : guestToken);
  const { data: order, isLoading, isError } = user ? mine : guest;
  // Shipment-level tracking is scoped to the order's owner; guests keep the
  // order-status timeline and can use /track with their tracking number.
  const { data: shipments } = useOrderShipments(id, Boolean(user));

  // Signed out with no token: login is the only path to this order. Deferred a
  // tick so the credential effect gets a chance to find a stashed token first.
  useEffect(() => {
    if (user || guestToken) return;
    const t = setTimeout(
      () => router.replace(`/login?redirect=/orders/${id}`),
      150,
    );
    return () => clearTimeout(t);
  }, [user, guestToken, router, id]);

  if (!user && !guestToken) return null;
  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (isError || !order) {
    return <p className="container py-16 text-center text-muted-foreground">Order not found.</p>;
  }

  const currentIdx = TIMELINE.indexOf(order.status);
  const terminal = ['CANCELLED', 'RETURNED', 'REFUNDED'].includes(order.status);

  return (
    <div className="container max-w-3xl space-y-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Order {order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            Placed {new Date(order.placedAt).toLocaleString()}
          </p>
        </div>
        <Badge variant={terminal ? 'destructive' : 'secondary'}>{order.status}</Badge>
      </div>

      {!terminal && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex items-center justify-between">
              {TIMELINE.map((stage, i) => {
                const done = i <= currentIdx;
                return (
                  <li key={stage} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        done ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {done ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
                    </div>
                    <span className="text-[11px] text-muted-foreground">{stage}</span>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      )}

      {shipments && shipments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {shipments.length === 1 ? 'Shipment' : 'Shipments'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {shipments.map((shipment, i) => (
              <div key={shipment.id}>
                {i > 0 && <Separator className="mb-6" />}
                <ShipmentTracker shipment={shipment} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {order.items.map((it) => (
            <div key={it.id} className="flex justify-between text-sm">
              <span>
                {it.nameSnapshot}{' '}
                <span className="text-muted-foreground">× {it.quantity}</span>
              </span>
              <span>
                {order.currency} {it.lineTotal.toFixed(2)}
              </span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-2 font-semibold">
            <span>Total</span>
            <span>
              {order.currency} {order.grandTotal.toFixed(2)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Payment: {order.paymentStatus}</p>
        </CardContent>
      </Card>

      <Button asChild variant="outline">
        {user ? (
          <Link href="/account">Back to account</Link>
        ) : (
          <Link href="/products">Continue shopping</Link>
        )}
      </Button>
    </div>
  );
}
