'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'REFUNDED',
] as const;

export interface OrderItem {
  id: string;
  sku: string;
  nameSnapshot: string;
  unitPrice: number;
  quantity: number;
  fulfilledQuantity: number;
  lineTotal: number;
}
export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  grandTotal: number;
  currency: string;
  customerId: string;
  placedAt: string;
  items: OrderItem[];
}

export function useOrders(params: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => api.getFull<Order[]>('/orders', params as Record<string, unknown>),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch<Order>(`/orders/${id}/status`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  });
}
