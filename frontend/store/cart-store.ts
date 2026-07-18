'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  variantId: string;
  sku: string;
  name: string;
  variantLabel: string;
  price: number;
  currency: string;
  image?: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  add: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  remove: (sku: string) => void;
  setQty: (sku: string, quantity: number) => void;
  clear: () => void;
  count: () => number;
  subtotal: () => number;
}

/** Client-side cart, persisted to localStorage. Keyed by variant SKU. */
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item, quantity = 1) =>
        set((state) => {
          const existing = state.items.find((i) => i.sku === item.sku);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.sku === item.sku
                  ? { ...i, quantity: i.quantity + quantity }
                  : i,
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity }] };
        }),
      remove: (sku) =>
        set((state) => ({ items: state.items.filter((i) => i.sku !== sku) })),
      setQty: (sku, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.sku === sku ? { ...i, quantity: Math.max(1, quantity) } : i,
          ),
        })),
      clear: () => set({ items: [] }),
      count: () => get().items.reduce((n, i) => n + i.quantity, 0),
      subtotal: () =>
        get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: 'ecom-cart' },
  ),
);
