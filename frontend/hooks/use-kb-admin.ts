'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface AdminArticle {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  status: 'DRAFT' | 'PUBLISHED';
  /** `help` = support centre, `post` = storefront journal (/blog). */
  kind?: 'help' | 'post';
  blocks?: { type: string; data: Record<string, unknown> }[];
  views?: number;
  helpfulYes?: number;
  helpfulNo?: number;
}

export function useAdminArticles() {
  return useQuery({
    queryKey: ['kb-admin'],
    queryFn: () => api.get<AdminArticle[]>('/knowledge-base/admin/articles'),
  });
}

export function useArticleMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['kb-admin'] });
  return {
    create: useMutation({
      mutationFn: (body: {
        title: string;
        excerpt?: string;
        blocks?: { type: string; data: Record<string, unknown> }[];
        kind?: 'help' | 'post';
      }) => api.post<AdminArticle>('/knowledge-base/articles', body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Partial<AdminArticle> }) =>
        api.patch<AdminArticle>(`/knowledge-base/articles/${id}`, body),
      onSuccess: invalidate,
    }),
    publish: useMutation({
      mutationFn: ({ id, publish }: { id: string; publish: boolean }) =>
        api.post<AdminArticle>(
          `/knowledge-base/articles/${id}/${publish ? 'publish' : 'unpublish'}`,
          {},
        ),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.del(`/knowledge-base/articles/${id}`),
      onSuccess: invalidate,
    }),
  };
}
