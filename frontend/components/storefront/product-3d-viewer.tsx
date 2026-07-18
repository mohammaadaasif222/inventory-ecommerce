'use client';

import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, Pause, Play } from 'lucide-react';
import { Product360Spin } from './product-360-spin';
import { viewerIsActive, type ViewerConfig } from '@/hooks/use-viewer-config';
import { cn } from '@/lib/utils';

// three.js loads as its own chunk, and only when a 3d-mode viewer scrolls
// into view — pages without a model never pay for it.
const Product3DCanvas = dynamic(() => import('./product-3d-canvas'), {
  ssr: false,
  loading: () => <ViewerSkeleton label="Preparing 3D viewer…" />,
});

function ViewerSkeleton({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="text-xs">{label}</span>
    </div>
  );
}

/** WebGL/model failures degrade to the product photo, never a broken page. */
class ViewerErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Mount heavy content only once the container nears the viewport. */
function useNearViewport<T extends HTMLElement>(): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    const observer = new IntersectionObserver(
      (entries) => entries.some((e) => e.isIntersecting) && setNear(true),
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [near]);

  return [ref, near];
}

const WRAPPER_BG: Record<string, string> = {
  'studio-light': 'bg-[#f4f4f5]',
  'dark-luxury': 'bg-[#0c1013]',
  gradient: 'bg-gradient-to-br from-secondary via-background to-secondary',
  transparent: 'bg-transparent',
};

export interface Product3DViewerProps {
  config: ViewerConfig;
  /** Shown if WebGL or the model fails, and as the static fallback. */
  fallbackImage?: string;
  alt?: string;
  className?: string;
}

/**
 * The product-page 3D widget. Renders a real .glb scene or the 360° photo
 * spin per the admin's config, lazy-mounts near the viewport, and degrades
 * to the product photo on any failure.
 */
export function Product3DViewer({
  config,
  fallbackImage,
  alt = 'Product 3D view',
  className,
}: Product3DViewerProps) {
  const [ref, near] = useNearViewport<HTMLDivElement>();
  const [autoRotate, setAutoRotate] = useState(config.autoRotate ?? true);

  if (!viewerIsActive(config)) return null;

  const fallback = fallbackImage ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={fallbackImage} alt={alt} className="h-full w-full object-cover" />
  ) : (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      3D view unavailable
    </div>
  );

  return (
    <div
      ref={ref}
      className={cn(
        'relative aspect-square w-full overflow-hidden',
        WRAPPER_BG[config.background ?? 'studio-light'],
        className,
      )}
    >
      {!near ? (
        <ViewerSkeleton label="Loading viewer…" />
      ) : config.type === '3d' && config.modelUrl ? (
        <ViewerErrorBoundary fallback={fallback}>
          <Product3DCanvas
            modelUrl={config.modelUrl}
            autoRotate={autoRotate}
            rotateSpeed={config.rotateSpeed ?? 2}
            background={config.background ?? 'studio-light'}
            minZoom={config.minZoom ?? 1.5}
            maxZoom={config.maxZoom ?? 5}
            defaultZoom={config.defaultZoom ?? 2.6}
          />
        </ViewerErrorBoundary>
      ) : (
        <Product360Spin
          images={config.images ?? []}
          autoRotate={autoRotate}
          rotateSpeed={config.rotateSpeed ?? 2}
          alt={alt}
        />
      )}

      {near && (
        <button
          type="button"
          onClick={() => setAutoRotate((v) => !v)}
          aria-label={autoRotate ? 'Pause rotation' : 'Resume rotation'}
          aria-pressed={autoRotate}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 shadow backdrop-blur transition-colors hover:bg-background"
        >
          {autoRotate ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}
