'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppliedCoupon } from '@/hooks/use-coupons';

interface CouponState {
  applied: AppliedCoupon | null;
  apply: (coupon: AppliedCoupon) => void;
  clear: () => void;
}

/**
 * Holds the coupon between cart and checkout. The stored `discount` is only a
 * preview — the server recomputes it from `code` when the order is placed, so
 * tampering with this store changes nothing that matters.
 */
export const useCouponStore = create<CouponState>()(
  persist(
    (set) => ({
      applied: null,
      apply: (coupon) => set({ applied: coupon }),
      clear: () => set({ applied: null }),
    }),
    { name: 'ecom-coupon' },
  ),
);
