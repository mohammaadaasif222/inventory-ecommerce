'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { Order } from '@/hooks/use-orders';

export interface Profile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  phone: string | null;
  roles: string[];
}

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<Profile>('/users/me'),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { firstName?: string; lastName?: string; phone?: string }) =>
      api.patch<Profile>('/users/me', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}

export function useMyOrders() {
  return useQuery({
    queryKey: ['my-orders'],
    queryFn: () => api.getFull<Order[]>('/orders/mine', { limit: 20 }),
  });
}

export function useMyOrder(id: string, enabled = true) {
  return useQuery({
    queryKey: ['my-order', id],
    queryFn: () => api.get<Order>(`/orders/mine/${id}`),
    enabled: !!id && enabled,
  });
}

/**
 * A guest's order, authorised by the token from checkout (or the confirmation
 * email's link). Public endpoint — the token is the credential.
 */
export function useGuestOrder(id: string, token: string | null) {
  return useQuery({
    queryKey: ['guest-order', id, token],
    queryFn: () =>
      api.get<Order>(`/orders/guest/${id}`, { token: token ?? '' }),
    enabled: !!id && !!token,
  });
}
