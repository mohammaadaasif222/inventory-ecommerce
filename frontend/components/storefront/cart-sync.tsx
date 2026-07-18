'use client';

import { useEffect, useRef } from 'react';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useCartStore } from '@/store/cart-store';

const DEBOUNCE_MS = 1500;

/**
 * Mirrors the browser cart to the server while signed in, so the
 * abandoned-cart sweeper has something to find. The zustand store stays the
 * source of truth for cart UX — this is a one-way, best-effort push.
 *
 * Mounted once in the storefront layout; renders nothing.
 */
export function CartSync() {
  const signedIn = useAuthStore((s) => !!s.user);
  const items = useCartStore((s) => s.items);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const lastPayload = useRef<string>('');

  useEffect(() => {
    if (!signedIn) return;

    const payload = {
      currency: items[0]?.currency ?? 'INR',
      items: items.map((i) => ({
        sku: i.sku,
        productId: i.productId,
        nameSnapshot: i.name,
        imageUrl: i.image,
        unitPrice: i.price,
        quantity: i.quantity,
      })),
    };

    // Skip no-op syncs (e.g. re-renders that don't change the cart).
    const serialised = JSON.stringify(payload);
    if (serialised === lastPayload.current) return;

    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      lastPayload.current = serialised;
      // Cart sync is a background nicety — never surface its failures.
      void api.post('/carts/sync', payload).catch(() => {
        lastPayload.current = '';
      });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer.current);
  }, [signedIn, items]);

  return null;
}
