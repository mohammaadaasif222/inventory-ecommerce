'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface Customer {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  status: 'ACTIVE' | 'BANNED' | 'PENDING';
  createdAt: string;
}

export function useCustomers(params: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: () => api.getFull<Customer[]>('/users', params as Record<string, unknown>),
  });
}

export function useSetBan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ban }: { id: string; ban: boolean }) =>
      api.post<Customer>(`/users/${id}/${ban ? 'ban' : 'unban'}`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  });
}
