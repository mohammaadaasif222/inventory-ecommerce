'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { ThemeCustomizations } from '@/themes/config';

// ── Homepage builder ──
export interface Section {
  _id: string;
  type: string;
  title: string;
  config: Record<string, unknown>;
  order: number;
  isVisible: boolean;
  /** Theme slug this section renders in, or null/absent for every theme. */
  theme?: string | null;
}

export function useAdminSections() {
  return useQuery({
    queryKey: ['homepage-admin'],
    queryFn: () => api.get<Section[]>('/homepage/admin'),
  });
}

export function useSectionMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['homepage-admin'] });
  return {
    create: useMutation({
      mutationFn: (body: { type: string; title?: string; theme?: string }) =>
        api.post<Section>('/homepage', body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Partial<Section> }) =>
        api.patch<Section>(`/homepage/${id}`, body),
      onSuccess: invalidate,
    }),
    toggle: useMutation({
      mutationFn: (id: string) => api.patch<Section>(`/homepage/${id}/toggle`, {}),
      onSuccess: invalidate,
    }),
    reorder: useMutation({
      mutationFn: (orderedIds: string[]) =>
        api.patch('/homepage/reorder', { orderedIds }),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.del(`/homepage/${id}`),
      onSuccess: invalidate,
    }),
  };
}

// ── Theme engine ──
//
// The storefront does NOT read theme state through these hooks — it resolves
// the active theme server-side (`lib/active-theme.ts`) so the first byte is
// already themed. These exist for the admin's theme manager, which needs the
// registry, the rollback state and write access.

/** An installed theme as the registry records it. */
export interface InstalledTheme {
  slug: string;
  name: string;
  version: string;
  description: string;
  extends: string | null;
  active: boolean;
  installed: boolean;
  customizations: ThemeCustomizations;
}

const THEMES_KEY = ['themes'];

export function useThemes() {
  return useQuery({
    queryKey: THEMES_KEY,
    queryFn: () => api.get<InstalledTheme[]>('/themes'),
  });
}

export function useCanRollback() {
  return useQuery({
    queryKey: ['themes', 'rollback-available'],
    queryFn: () => api.get<{ canRollback: boolean }>('/themes/rollback-available'),
  });
}

/**
 * Reconcile the registry with the packages on disk.
 *
 * The frontend holds the theme files, so only it knows what is installed. The
 * manager calls this on load, which is what makes dropping a folder into
 * `themes/` enough to install a theme.
 */
export function useSyncThemes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (themes: Array<Omit<InstalledTheme, 'active' | 'installed' | 'customizations'>>) =>
      api.post<InstalledTheme[]>('/themes/sync', { themes }),
    onSuccess: () => qc.invalidateQueries({ queryKey: THEMES_KEY }),
  });
}

export function useThemeMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: THEMES_KEY });

  return {
    activate: useMutation({
      mutationFn: ({
        slug,
        customizations,
      }: {
        slug: string;
        customizations?: ThemeCustomizations;
      }) => api.post(`/themes/${slug}/activate`, { customizations }),
      onSuccess: invalidate,
    }),
    customize: useMutation({
      mutationFn: ({
        slug,
        patch,
      }: {
        slug: string;
        patch: ThemeCustomizations;
      }) => api.patch<InstalledTheme>(`/themes/${slug}/customize`, patch),
      onSuccess: invalidate,
    }),
    rollback: useMutation({
      mutationFn: () => api.post('/themes/rollback', {}),
      onSuccess: invalidate,
    }),
  };
}

// ── Popups ──
/** Free-form popup body: banner image, message and an optional link button. */
export interface PopupContent {
  message?: string;
  imageUrl?: string;
  buttonLabel?: string;
  buttonUrl?: string;
}
export interface Popup {
  _id: string;
  type: string;
  title: string;
  content: PopupContent;
  displayRules: { delaySeconds?: number; scrollPercent?: number; pageTargets?: string[]; frequencyCap?: number };
  isActive: boolean;
}
export const POPUP_TYPES = ['announcement_bar', 'exit_intent', 'timed_modal', 'cookie_consent'] as const;

export function usePopups() {
  return useQuery({ queryKey: ['popups'], queryFn: () => api.get<Popup[]>('/popups') });
}

/** Active popups for a storefront path — public endpoint, no auth needed. */
export function useActivePopups(path: string) {
  return useQuery({
    queryKey: ['popups-active', path],
    queryFn: () => api.get<Popup[]>('/popups/active', { path }),
  });
}

export function usePopupMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['popups'] });
  return {
    create: useMutation({
      mutationFn: (body: { type: string; title?: string; content?: PopupContent }) =>
        api.post<Popup>('/popups', body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: { title?: string; content?: PopupContent } }) =>
        api.patch<Popup>(`/popups/${id}`, body),
      onSuccess: invalidate,
    }),
    toggle: useMutation({
      mutationFn: (id: string) => api.patch<Popup>(`/popups/${id}/toggle`, {}),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.del(`/popups/${id}`),
      onSuccess: invalidate,
    }),
  };
}

// ── SEO ──
export type SeoScope = 'global' | 'product' | 'category' | 'page';
export interface SeoMeta {
  _id?: string;
  scope: SeoScope;
  entityId?: string | null;
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
  canonicalUrl?: string;
  noindex?: boolean;
}
export function useGlobalSeo() {
  return useQuery({ queryKey: ['seo-global'], queryFn: () => api.get<SeoMeta | null>('/seo/global') });
}
/** Every stored SEO entry (global + overrides) — the admin panel's list. */
export function useSeoEntries() {
  return useQuery({ queryKey: ['seo-entries'], queryFn: () => api.get<SeoMeta[]>('/seo') });
}
export function useSaveSeo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SeoMeta) => api.put<SeoMeta>('/seo', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seo-global'] });
      qc.invalidateQueries({ queryKey: ['seo-entries'] });
    },
  });
}
export function useDeleteSeo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del(`/seo/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['seo-entries'] }),
  });
}
