'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  isDefault: boolean;
}
export interface StockItem {
  id: string;
  sku: string;
  warehouseId: string;
  quantity: number;
  reserved: number;
  lowStockThreshold: number;
}
export interface AdjustStockInput {
  sku: string;
  warehouseId: string;
  type: 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT';
  quantity: number;
  reason?: string;
}

export function useWarehouses() {
  return useQuery({
    queryKey: ['warehouses'],
    queryFn: () => api.get<Warehouse[]>('/inventory/warehouses'),
  });
}

export function useStock(params: {
  page?: number;
  limit?: number;
  search?: string;
  lowOnly?: boolean;
}) {
  return useQuery({
    queryKey: ['stock', params],
    queryFn: () =>
      api.getFull<StockItem[]>(
        '/inventory/stock',
        params as Record<string, unknown>,
      ),
  });
}

export function useAdjustStock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AdjustStockInput) =>
      api.post<StockItem>('/inventory/stock/adjust', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stock'] }),
  });
}

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; code: string; isDefault?: boolean }) =>
      api.post<Warehouse>('/inventory/warehouses', input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['warehouses'] }),
  });
}
