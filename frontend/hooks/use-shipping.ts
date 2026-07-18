'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface Zone {
  id: string;
  name: string;
  countries: string[];
  isActive: boolean;
}
export interface Method {
  id: string;
  zoneId: string;
  name: string;
  carrier: string;
  rateType: 'FLAT' | 'WEIGHT' | 'PRICE';
  baseRate: number;
  perKgRate: number;
  freeAbove: number | null;
  estimatedDays: number;
  isActive: boolean;
}

export function useZones() {
  return useQuery({ queryKey: ['zones'], queryFn: () => api.get<Zone[]>('/shipping/zones') });
}
export function useMethods() {
  return useQuery({ queryKey: ['methods'], queryFn: () => api.get<Method[]>('/shipping/methods') });
}

export function useShippingMutations() {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['zones'] });
    qc.invalidateQueries({ queryKey: ['methods'] });
  };
  return {
    createZone: useMutation({
      mutationFn: (body: { name: string; countries: string[] }) =>
        api.post<Zone>('/shipping/zones', body),
      onSuccess: inv,
    }),
    createMethod: useMutation({
      mutationFn: (body: {
        zoneId: string;
        name: string;
        carrier?: string;
        rateType: string;
        baseRate?: number;
        estimatedDays?: number;
      }) => api.post<Method>('/shipping/methods', body),
      onSuccess: inv,
    }),
  };
}
