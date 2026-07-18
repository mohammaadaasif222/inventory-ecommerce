'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Rotate3d } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Product360SpinProps {
  /** Ordered turntable frames — one full revolution, shot at even angles. */
  images: string[];
  autoRotate?: boolean;
  /** Idle-spin speed: frames advanced per second ≈ speed × 6. */
  rotateSpeed?: number;
  alt?: string;
  className?: string;
}

/**
 * "Fake 3D" from a photo sequence: dragging (or swiping) scrubs through the
 * frames so the bottle appears to turn, with inertia on release and an idle
 * auto-spin. All frames are preloaded so scrubbing never flashes.
 */
export function Product360Spin({
  images,
  autoRotate = true,
  rotateSpeed = 2,
  alt = 'Product 360 view',
  className,
}: Product360SpinProps) {
  const count = images.length;
  const containerRef = useRef<HTMLDivElement>(null);

  // Float frame position; rendering rounds and wraps. Refs, not state, drive
  // the animation — state is only the rounded frame that actually renders.
  const position = useRef(0);
  const velocity = useRef(0);
  const dragging = useRef(false);
  const lastX = useRef(0);
  const lastMove = useRef(0);
  const [frame, setFrame] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [interacted, setInteracted] = useState(false);

  const ready = loaded >= Math.min(count, 4); // first frames in, start showing

  // Preload every frame once.
  useEffect(() => {
    let alive = true;
    images.forEach((src) => {
      const img = new Image();
      img.onload = img.onerror = () => alive && setLoaded((n) => n + 1);
      img.src = src;
    });
    return () => {
      alive = false;
    };
  }, [images]);

  const applyPosition = useCallback(
    (next: number) => {
      position.current = next;
      const wrapped = ((Math.round(next) % count) + count) % count;
      setFrame(wrapped);
    },
    [count],
  );

  // Inertia + idle auto-rotate loop.
  useEffect(() => {
    let raf: number;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!dragging.current) {
        if (Math.abs(velocity.current) > 0.5) {
          applyPosition(position.current + velocity.current * dt);
          velocity.current *= Math.pow(0.05, dt); // exponential decay
        } else if (autoRotate) {
          applyPosition(position.current + rotateSpeed * 6 * dt);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [applyPosition, autoRotate, rotateSpeed]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    setInteracted(true);
    velocity.current = 0;
    lastX.current = e.clientX;
    lastMove.current = performance.now();
    (e.target as Element).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const width = containerRef.current?.clientWidth ?? 400;
    const dx = e.clientX - lastX.current;
    const now = performance.now();
    // One full drag across the element = one full revolution.
    const dFrames = (dx / width) * count;
    applyPosition(position.current + dFrames);
    const dt = Math.max(1, now - lastMove.current) / 1000;
    velocity.current = dFrames / dt;
    lastX.current = e.clientX;
    lastMove.current = now;
  };

  const onPointerUp = () => {
    dragging.current = false;
    // Clamp flick speed so a hard swipe doesn't spin forever.
    velocity.current = Math.max(-60, Math.min(60, velocity.current));
  };

  if (count === 0) return null;

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={`${alt} — drag to rotate`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className={cn(
        'relative h-full w-full cursor-grab touch-none select-none active:cursor-grabbing',
        className,
      )}
    >
      {!ready ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-xs">
            Loading 360° view ({loaded}/{count})
          </span>
        </div>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[frame]}
            alt={alt}
            draggable={false}
            className="h-full w-full object-contain"
          />
          {!interacted && (
            <span className="pointer-events-none absolute inset-x-0 bottom-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Rotate3d className="h-4 w-4" /> Drag to rotate
            </span>
          )}
        </>
      )}
    </div>
  );
}
