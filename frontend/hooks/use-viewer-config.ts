'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export type ViewerType = '3d' | '360' | 'static';
export type ViewerBackground =
  | 'studio-light'
  | 'dark-luxury'
  | 'gradient'
  | 'transparent';

/** Per-product 3D/360 widget settings, stored as JSON on the backend. */
export interface ViewerConfig {
  type: ViewerType;
  modelUrl?: string;
  images?: string[];
  autoRotate?: boolean;
  rotateSpeed?: number;
  background?: ViewerBackground;
  minZoom?: number;
  maxZoom?: number;
  defaultZoom?: number;
}

export const VIEWER_BACKGROUNDS: { value: ViewerBackground; label: string }[] = [
  { value: 'studio-light', label: 'Studio white' },
  { value: 'dark-luxury', label: 'Dark luxury' },
  { value: 'gradient', label: 'Brand gradient' },
  { value: 'transparent', label: 'Transparent' },
];

/** True when the config actually has something to show. */
export function viewerIsActive(config: ViewerConfig | null | undefined): boolean {
  if (!config) return false;
  if (config.type === '3d') return !!config.modelUrl;
  if (config.type === '360') return (config.images?.length ?? 0) >= 2;
  return false;
}

export function useViewerConfig(productId: string | undefined) {
  return useQuery({
    queryKey: ['viewer-config', productId],
    queryFn: () => api.get<ViewerConfig | null>(`/products/${productId}/viewer`),
    enabled: !!productId,
    staleTime: 60 * 1000,
  });
}

export function useSaveViewerConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, config }: { productId: string; config: ViewerConfig }) =>
      api.put<ViewerConfig>(`/products/${productId}/viewer`, config),
    onSuccess: (_data, { productId }) =>
      qc.invalidateQueries({ queryKey: ['viewer-config', productId] }),
  });
}
