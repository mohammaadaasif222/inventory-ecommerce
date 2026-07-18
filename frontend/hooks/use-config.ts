'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface SiteSetting {
  key: string;
  value: unknown;
  section: string;
  isPublic: boolean;
}

// ── footer settings (admin-editable, storefront-rendered) ──
export const FOOTER_SETTINGS_KEY = 'footer.settings';

export interface FooterLink {
  label: string;
  href: string;
}
export interface FooterColumn {
  title: string;
  links: FooterLink[];
}
export interface FooterSettings {
  aboutText?: string;
  copyrightText?: string;
  socials?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
  };
  columns?: FooterColumn[];
  showPaymentBadges?: boolean;
}

/**
 * All public settings as one map — the storefront's read path. One request,
 * Redis-cached server-side, so every public setting rides the same fetch.
 */
export function usePublicConfig() {
  return useQuery({
    queryKey: ['config-public'],
    queryFn: () => api.get<Record<string, unknown>>('/config/public'),
    staleTime: 5 * 60 * 1000,
  });
}

/** One public setting's value out of the shared map (null while loading/unset). */
export function usePublicSetting<T>(key: string): T | null {
  const { data } = usePublicConfig();
  return (data?.[key] ?? null) as T | null;
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
