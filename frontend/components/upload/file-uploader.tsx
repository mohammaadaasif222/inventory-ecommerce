'use client';

import { useCallback, useState } from 'react';
import { useDropzone, type Accept } from 'react-dropzone';
import { File as FileIcon, UploadCloud, X, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api-client';
import { cn, formatBytes } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

/** Result returned by the backend for a single uploaded file. */
export interface UploadResult {
  url: string;
  storageId: string;
  provider: string;
  mimetype: string;
  size: number;
  width?: number;
  height?: number;
}

interface UploadItem {
  id: string;
  file: File;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  result?: UploadResult;
  error?: string;
}

export interface FileUploaderProps {
  /** Dropzone accept map, e.g. { 'image/*': [] }. */
  accept?: Accept;
  /** Max size per file in bytes. Default 5MB. */
  maxSize?: number;
  /** Max number of files. Default 1. */
  maxFiles?: number;
  /** Target storage folder (products, avatars, cms, …). */
  folder: string;
  /** Called with the cumulative list of successful uploads. */
  onUploadComplete?: (results: UploadResult[]) => void;
}

const DEFAULT_MAX = 5 * 1024 * 1024;

export function FileUploader({
  accept = { 'image/*': [] },
  maxSize = DEFAULT_MAX,
  maxFiles = 1,
  folder,
  onUploadComplete,
}: FileUploaderProps) {
  const [items, setItems] = useState<UploadItem[]>([]);

  const uploadOne = useCallback(
    async (item: UploadItem) => {
      const formData = new FormData();
      formData.append('file', item.file);
      formData.append('folder', folder);
      try {
        setStatus(item.id, { status: 'uploading' });
        const result = await api.upload<UploadResult>(
          '/upload/file',
          formData,
          (pct) => setStatus(item.id, { progress: pct }),
        );
        setStatus(item.id, { status: 'done', progress: 100, result });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setStatus(item.id, { status: 'error', error: message });
        toast.error(`${item.file.name}: ${message}`);
        return null;
      }
    },
    [folder],
  );

  const setStatus = (id: string, patch: Partial<UploadItem>) =>
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    );

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const room = maxFiles - items.length;
      const batch = accepted.slice(0, Math.max(0, room));
      if (batch.length === 0) return;

      const newItems: UploadItem[] = batch.map((file, i) => ({
        id: `${Date.now()}-${i}-${file.name}`,
        file,
        preview: file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : undefined,
        progress: 0,
        status: 'pending',
      }));
      setItems((prev) => [...prev, ...newItems]);

      const results = await Promise.all(newItems.map(uploadOne));
      const ok = results.filter((r): r is UploadResult => r !== null);
      if (ok.length > 0) onUploadComplete?.(ok);
    },
    [items.length, maxFiles, uploadOne, onUploadComplete],
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({ onDrop, accept, maxSize, maxFiles });

  const remove = (id: string) =>
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((it) => it.id !== id);
    });

  const atCapacity = items.length >= maxFiles;

  return (
    <div className="space-y-4">
      {!atCapacity && (
        <div
          {...getRootProps()}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50',
          )}
        >
          <input {...getInputProps()} />
          <UploadCloud className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            {isDragActive
              ? 'Drop the files here…'
              : 'Drag & drop, or click to browse'}
          </p>
          <p className="text-xs text-muted-foreground">
            Up to {maxFiles} file{maxFiles > 1 ? 's' : ''}, max{' '}
            {formatBytes(maxSize)} each
          </p>
        </div>
      )}

      {fileRejections.length > 0 && (
        <p className="text-xs text-destructive">
          {fileRejections[0].errors[0]?.message}
        </p>
      )}

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-3 rounded-md border p-3"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                {item.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.preview}
                    alt={item.file.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FileIcon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">
                    {item.file.name}
                  </p>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatBytes(item.file.size)}
                  </span>
                </div>
                {item.status === 'uploading' || item.status === 'pending' ? (
                  <Progress value={item.progress} className="mt-2" />
                ) : item.status === 'done' ? (
                  <p className="mt-1 flex items-center gap-1 text-xs text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Uploaded
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-destructive">{item.error}</p>
                )}
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(item.id)}
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
