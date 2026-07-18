'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useProductThemeVisibility,
  useSaveProductThemeVisibility,
} from '@/hooks/use-theme-visibility';
import { listSelectableThemes } from '@/themes/catalog';

/**
 * Per-product, per-theme visibility. Checked = the product renders in that
 * theme (subject to the theme's category scope); unchecked writes a hide row
 * for that theme only. The product itself is never touched.
 */
export function ThemeVisibilityDialog({
  productId,
  productName,
  onClose,
}: {
  productId: string;
  productName: string;
  onClose: () => void;
}) {
  const themes = listSelectableThemes();
  const { data, isLoading } = useProductThemeVisibility(productId);
  const save = useSaveProductThemeVisibility();
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (data) setHidden(new Set(data.hiddenThemes));
  }, [data]);

  const toggle = (slug: string, visible: boolean) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (visible) next.delete(slug);
      else next.add(slug);
      return next;
    });

  const onSave = () =>
    save.mutate(
      { productId, hiddenThemes: [...hidden] },
      {
        onSuccess: () => {
          toast.success('Theme visibility saved');
          onClose();
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Theme visibility — {productName}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Where this product appears. Vertical themes additionally scope by
              category, so a product outside their category never shows there
              regardless.
            </p>
            <div className="space-y-2">
              {themes.map((theme) => (
                <label
                  key={theme.slug}
                  className="flex cursor-pointer items-center justify-between rounded-md border p-3"
                >
                  <span className="text-sm font-medium">{theme.name}</span>
                  <input
                    type="checkbox"
                    checked={!hidden.has(theme.slug)}
                    onChange={(e) => toggle(theme.slug, e.target.checked)}
                    className="h-4 w-4"
                  />
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={onSave} disabled={save.isPending}>
                {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
