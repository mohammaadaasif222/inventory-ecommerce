'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface AuditLog {
  id: string;
  actorEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
}

export function useAuditLog(params: { page?: number; search?: string }) {
  return useQuery({
    queryKey: ['audit-log', params],
    queryFn: () => api.getFull<AuditLog[]>('/admin/audit-log', { limit: 20, ...params }),
  });
}

export function usePermissionMatrix() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: () => api.get<Record<string, string[]>>('/admin/permissions'),
  });
}
