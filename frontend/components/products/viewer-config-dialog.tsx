'use client';

import { useEffect, useState } from 'react';
import { Box, Images, ImageOff, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { FileUploader } from '@/components/upload/file-uploader';
import {
  VIEWER_BACKGROUNDS,
  useSaveViewerConfig,
  useViewerConfig,
  type ViewerBackground,
  type ViewerConfig,
  type ViewerType,
} from '@/hooks/use-viewer-config';
import { cn } from '@/lib/utils';

const MODES: { value: ViewerType; label: string; Icon: typeof Box; hint: string }[] = [
  { value: 'static', label: 'Static image', Icon: ImageOff, hint: 'Regular photo gallery only' },
  { value: '3d', label: '3D model', Icon: Box, hint: '.glb/.gltf, orbit + zoom' },
  { value: '360', label: '360° spin', Icon: Images, hint: '24–36 photos, drag to rotate' },
];

const DEFAULTS: ViewerConfig = {
  type: 'static',
  autoRotate: true,
  rotateSpeed: 2,
  background: 'studio-light',
  minZoom: 1.5,
  maxZoom: 5,
  defaultZoom: 2.6,
};

/**
 * Per-product 3D/360 widget settings. Model files and spin frames go through
 * the same upload service as every other media asset — one library, shared
 * with banners and product photos.
 */
export function ViewerConfigDialog({
  productId,
  productName,
  onClose,
}: {
  productId: string;
  productName: string;
  onClose: () => void;
}) {
  const { data: saved, isLoading } = useViewerConfig(productId);
  const save = useSaveViewerConfig();
  const [config, setConfig] = useState<ViewerConfig>(DEFAULTS);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (saved) setConfig({ ...DEFAULTS, ...saved });
  }, [saved]);

  const patch = (next: Partial<ViewerConfig>) =>
    setConfig((c) => ({ ...c, ...next }));

  const moveFrame = (from: number, to: number) => {
    setConfig((c) => {
      const images = [...(c.images ?? [])];
      const [moved] = images.splice(from, 1);
      images.splice(to, 0, moved);
      return { ...c, images };
    });
  };

  const onSave = () => {
    if (config.type === '3d' && !config.modelUrl) {
      return toast.error('Upload a .glb model first, or switch mode');
    }
    if (config.type === '360' && (config.images?.length ?? 0) < 2) {
      return toast.error('Upload at least a few 360° frames first');
    }
    save.mutate(
      { productId, config },
      {
        onSuccess: () => {
          toast.success('Viewer settings saved');
          onClose();
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>3D / 360° viewer — {productName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* Mode */}
            <div role="radiogroup" aria-label="Viewer mode" className="grid gap-2 sm:grid-cols-3">
              {MODES.map(({ value, label, Icon, hint }) => (
                <button
                  key={value}
                  role="radio"
                  aria-checked={config.type === value}
                  onClick={() => patch({ type: value })}
                  className={cn(
                    'rounded-md border p-3 text-left transition-colors',
                    config.type === value
                      ? 'border-brand bg-secondary/50'
                      : 'hover:border-brand/40',
                  )}
                >
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <Icon className="h-4 w-4 text-brand" /> {label}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
                </button>
              ))}
            </div>

            {/* 3D model upload */}
            {config.type === '3d' && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Model file (.glb / .gltf, keep under ~5MB for fast loads)
                </p>
                {config.modelUrl ? (
                  <div className="flex items-center justify-between rounded-md border p-3 text-sm">
                    <span className="flex items-center gap-2 truncate">
                      <Box className="h-4 w-4 shrink-0 text-brand" />
                      <span className="truncate font-mono text-xs">{config.modelUrl}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove model"
                      onClick={() => patch({ modelUrl: undefined })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <FileUploader
                    folder="models"
                    maxSize={10 * 1024 * 1024}
                    accept={{
                      'model/gltf-binary': ['.glb'],
                      'model/gltf+json': ['.gltf'],
                      'application/octet-stream': ['.glb', '.gltf'],
                    }}
                    onUploadComplete={(results) =>
                      results[0] && patch({ modelUrl: results[0].url })
                    }
                  />
                )}
              </div>
            )}

            {/* 360 frames */}
            {config.type === '360' && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Turntable frames — upload in shooting order (24–36 shots, 10–15°
                  apart), drag thumbnails to fix the sequence
                </p>
                {(config.images?.length ?? 0) > 0 && (
                  <div className="grid grid-cols-6 gap-2 sm:grid-cols-9">
                    {(config.images ?? []).map((url, i) => (
                      <div
                        key={`${url}-${i}`}
                        draggable
                        onDragStart={() => setDragIndex(i)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (dragIndex !== null && dragIndex !== i) moveFrame(dragIndex, i);
                          setDragIndex(null);
                        }}
                        className={cn(
                          'group relative aspect-square cursor-grab overflow-hidden rounded border',
                          dragIndex === i && 'opacity-40',
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Frame ${i + 1}`} className="h-full w-full object-cover" />
                        <span className="absolute bottom-0 left-0 bg-background/80 px-1 text-[9px] tabular-nums">
                          {i + 1}
                        </span>
                        <button
                          type="button"
                          aria-label={`Delete frame ${i + 1}`}
                          onClick={() =>
                            patch({ images: (config.images ?? []).filter((_, j) => j !== i) })
                          }
                          className="absolute right-0 top-0 hidden rounded-bl bg-background/80 p-0.5 group-hover:block"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <FileUploader
                  folder="spin"
                  maxFiles={36}
                  accept={{ 'image/*': [] }}
                  onUploadComplete={(results) =>
                    patch({
                      images: [...(config.images ?? []), ...results.map((r) => r.url)],
                    })
                  }
                />
              </div>
            )}

            {config.type !== 'static' && (
              <>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Background</label>
                    <select
                      value={config.background}
                      onChange={(e) =>
                        patch({ background: e.target.value as ViewerBackground })
                      }
                      className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                    >
                      {VIEWER_BACKGROUNDS.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={config.autoRotate}
                        onChange={(e) => patch({ autoRotate: e.target.checked })}
                        className="h-3.5 w-3.5"
                      />
                      Auto-rotate
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={0.5}
                        max={8}
                        step={0.5}
                        value={config.rotateSpeed}
                        onChange={(e) => patch({ rotateSpeed: Number(e.target.value) })}
                        disabled={!config.autoRotate}
                        aria-label="Rotate speed"
                        className="flex-1 accent-[hsl(var(--brand))]"
                      />
                      <span className="w-8 text-right text-xs tabular-nums">
                        {config.rotateSpeed}×
                      </span>
                    </div>
                  </div>
                </div>

                {config.type === '3d' && (
                  <div className="grid gap-4 sm:grid-cols-3">
                    {(
                      [
                        ['defaultZoom', 'Default zoom'],
                        ['minZoom', 'Closest zoom'],
                        ['maxZoom', 'Farthest zoom'],
                      ] as const
                    ).map(([key, label]) => (
                      <div key={key} className="space-y-1.5">
                        <label className="text-xs text-muted-foreground">{label}</label>
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          step={0.1}
                          value={config[key] ?? ''}
                          onChange={(e) => patch({ [key]: Number(e.target.value) })}
                          className="h-9"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={onSave} disabled={save.isPending}>
                {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save viewer
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
