'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export const TICKET_STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'PENDING_CUSTOMER',
  'RESOLVED',
  'CLOSED',
] as const;
export const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export interface TicketNote {
  id: string;
  authorId: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
}
export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string | null;
  status: string;
  priority: string;
  source: string;
  assigneeId: string | null;
  slaBreached: boolean;
  createdAt: string;
  notes?: TicketNote[];
}

export function useTickets(params: { page?: number; status?: string; priority?: string }) {
  return useQuery({
    queryKey: ['tickets', params],
    queryFn: () => api.getFull<Ticket[]>('/tickets', { limit: 20, ...params }),
  });
}

export function useTicket(id: string | null) {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => api.get<Ticket>(`/tickets/${id}`),
    enabled: !!id,
  });
}

export function useTicketMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tickets'] });
    qc.invalidateQueries({ queryKey: ['ticket'] });
  };
  return {
    setStatus: useMutation({
      mutationFn: ({ id, status }: { id: string; status: string }) =>
        api.patch<Ticket>(`/tickets/${id}/status`, { status }),
      onSuccess: invalidate,
    }),
    setPriority: useMutation({
      mutationFn: ({ id, priority }: { id: string; priority: string }) =>
        api.patch<Ticket>(`/tickets/${id}/priority`, { priority }),
      onSuccess: invalidate,
    }),
    addNote: useMutation({
      mutationFn: ({ id, body, isInternal }: { id: string; body: string; isInternal: boolean }) =>
        api.post<TicketNote>(`/tickets/${id}/notes`, { body, isInternal }),
      onSuccess: invalidate,
    }),
  };
}
