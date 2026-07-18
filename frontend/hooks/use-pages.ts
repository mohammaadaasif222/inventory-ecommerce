'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface CmsPage {
  _id: string;
  title: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED';
  blocks?: { type: string; data: Record<string, unknown> }[];
}

export function useAdminPages() {
  return useQuery({
    queryKey: ['cms-pages'],
    queryFn: () => api.get<CmsPage[]>('/pages'),
  });
}

export function usePageMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['cms-pages'] });
  return {
    create: useMutation({
      mutationFn: (body: {
        title: string;
        blocks?: { type: string; data: Record<string, unknown> }[];
      }) => api.post<CmsPage>('/pages', body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Partial<CmsPage> }) =>
        api.patch<CmsPage>(`/pages/${id}`, body),
      onSuccess: invalidate,
    }),
    publish: useMutation({
      mutationFn: ({ id, publish }: { id: string; publish: boolean }) =>
        api.post<CmsPage>(`/pages/${id}/${publish ? 'publish' : 'unpublish'}`, {}),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.del(`/pages/${id}`),
      onSuccess: invalidate,
    }),
  };
}
