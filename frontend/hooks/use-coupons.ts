'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export type CouponType = 'PERCENT' | 'FIXED' | 'FREE_SHIPPING';

export interface Offer {
  code: string;
  description: string | null;
  type: CouponType;
  value: number;
  minSpend: number;
  maxDiscount: number | null;
  expiresAt: string | null;
}

export interface AppliedCoupon {
  code: string;
  type: CouponType;
  value: number;
  description: string | null;
  discount: number;
}

/** Public offers strip — safe to show signed-out. */
export function useOffers() {
  return useQuery({
    queryKey: ['offers'],
    queryFn: () => api.get<Offer[]>('/coupons/offers'),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Previews a code against the cart. The authoritative discount is recomputed
 * server-side at checkout, so this is only ever a preview.
 */
export function useValidateCoupon() {
  return useMutation({
    mutationFn: (payload: {
      code: string;
      subtotal: number;
      shippingTotal?: number;
    }) => api.post<AppliedCoupon>('/coupons/validate', payload),
  });
}
