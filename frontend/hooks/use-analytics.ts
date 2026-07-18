'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface DashboardData {
  sales: {
    revenue: number;
    orders: number;
    avgOrderValue: number;
    itemsSold: number;
  };
  inventory: {
    totalSkus: number;
    lowStock: number;
    outOfStock: number;
    deadStock: number;
    totalUnits: number;
    turnoverRate: number;
  };
  support: {
    total: number;
    open: number;
    breached: number;
    avgResolutionMinutes: number;
  };
  chat: { total: number; active: number; closed: number };
  orderStatus: Record<string, number>;
}

export interface RevenuePoint {
  bucket: string;
  revenue: number;
  orders: number;
}

export function useDashboard() {
  return useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => api.get<DashboardData>('/analytics/dashboard'),
  });
}

export function useRevenueSeries(granularity: 'day' | 'week' | 'month' = 'day') {
  return useQuery({
    queryKey: ['analytics', 'revenue', granularity],
    queryFn: () =>
      api.get<RevenuePoint[]>('/analytics/sales/revenue', { granularity }),
  });
}
