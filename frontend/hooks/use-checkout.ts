'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface AddressInput {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface RateQuote {
  methodId: string;
  name: string;
  carrier: string;
  cost: number;
  estimatedDays: number;
  free: boolean;
}

export interface CreatedOrder {
  id: string;
  orderNumber: string;
  grandTotal: number;
  currency: string;
  /**
   * Present only on guest orders, only in this creation response — the
   * caller's sole key to the order page and payment. Persist it before
   * navigating away (see `lib/guest-order.ts`).
   */
  guestToken?: string | null;
}

export interface CheckoutInit {
  provider: string;
  status: string;
  providerOrderId?: string;
  clientSecret?: string;
  keyId?: string;
  amountMinor: number;
  currency: string;
}

export function useShippingRates() {
  return useMutation({
    mutationFn: (input: { country: string; orderTotal: number; weightGrams?: number }) =>
      api.post<RateQuote[]>('/shipping/rates', input),
  });
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: (body: {
      items: { sku: string; quantity: number }[];
      shippingAddress: AddressInput;
      shippingTotal?: number;
      /** Server computes the discount from this — never send an amount. */
      couponCode?: string;
      /** Free-text instructions (gift wrap, sample requests) shown on the order. */
      notes?: string;
      /** Guest checkout: where the confirmation goes. Omit when signed in. */
      guestEmail?: string;
    }) => api.post<CreatedOrder>('/orders', body),
  });
}

export function useInitiatePayment() {
  return useMutation({
    mutationFn: (body: {
      orderId: string;
      provider: 'COD' | 'STRIPE' | 'RAZORPAY';
      /** Authorises payment on a guest order in place of a session. */
      guestToken?: string;
    }) =>
      api.post<{ paymentId: string; checkout: CheckoutInit }>(
        '/payments/initiate',
        body,
      ),
  });
}
