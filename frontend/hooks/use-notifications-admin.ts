'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export const NOTIFICATION_CHANNELS = ['EMAIL', 'SMS', 'PUSH', 'WHATSAPP'] as const;

export interface NotificationTemplate {
  key: string;
  channel: string;
  subject: string;
  body: string;
  isActive: boolean;
}
export interface NotificationLog {
  _id: string;
  channel: string;
  to: string;
  templateKey: string;
  status: string;
  createdAt: string;
}

export function useTemplates() {
  return useQuery({
    queryKey: ['notif-templates'],
    queryFn: () => api.get<NotificationTemplate[]>('/notifications/templates'),
  });
}
export function useNotificationLogs() {
  return useQuery({
    queryKey: ['notif-logs'],
    queryFn: () => api.get<NotificationLog[]>('/notifications/logs'),
  });
}
export function useUpsertTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      key: string;
      channel: string;
      subject?: string;
      body: string;
    }) => api.put<NotificationTemplate>('/notifications/templates', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notif-templates'] }),
  });
}
