'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface SiteSetting {
  key: string;
  value: unknown;
  section: string;
  isPublic: boolean;
}

/** Fetch a single setting's value (null if unset). */
export function useSetting<T>(key: string) {
  return useQuery({
    queryKey: ['config', key],
    queryFn: async () => {
      const setting = await api.get<SiteSetting | null>(`/config/${key}`);
      return (setting?.value ?? null) as T | null;
    },
  });
}

export function useUpsertSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      key,
      value,
      isPublic = true,
      section = 'general',
    }: {
      key: string;
      value: unknown;
      isPublic?: boolean;
      section?: string;
    }) => api.put<SiteSetting>(`/config/${key}`, { value, isPublic, section }),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['config', vars.key] }),
  });
}
