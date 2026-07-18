'use client';

import { useEffect, useState } from 'react';
import { ImageIcon, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileUploader } from '@/components/upload/file-uploader';
import { useCategories, type Category } from '@/hooks/use-storefront';
import { useCategoryMutations, type CategoryBody } from '@/hooks/use-catalog';

/** Tree flattened for rendering and for the parent-picker. */
function flatten(
  nodes: Category[] | undefined,
  depth = 0,
): { category: Category; depth: number }[] {
  return (nodes ?? []).flatMap((c) => [
    { category: c, depth },
    ...flatten(c.children, depth + 1),
  ]);
}

interface EditorState {
  /** Null = creating. */
  id: string | null;
  name: string;
  parentId: string;
  imageUrl: string;
  isActive: boolean;
}

const NEW: EditorState = { id: null, name: '', parentId: '', imageUrl: '', isActive: true };

function CategoryDialog({
  initial,
  onClose,
}: {
  initial: EditorState;
  onClose: () => void;
}) {
  const { create, update } = useCategoryMutations();
  const { data: categories } = useCategories();
  const [state, setState] = useState<EditorState>(initial);
  const pending = create.isPending || update.isPending;

  useEffect(() => setState(initial), [initial]);

  // A category cannot be its own parent (or its descendant's child — the
  // backend guards cycles; the picker just removes the obvious self case).
  const parentOptions = flatten(categories).filter(
    ({ category }) => category.id !== state.id,
  );

  const onSave = () => {
    if (!state.name.trim()) return toast.error('Enter a name');
    const body: CategoryBody = {
      name: state.name.trim(),
      imageUrl: state.imageUrl || undefined,
      parentId: state.parentId || undefined,
      isActive: state.isActive,
    };
    const done = {
      onSuccess: () => {
        toast.success(state.id ? 'Category updated' : 'Category created');
        onClose();
      },
      onError: (e: Error) => toast.error(e.message),
    };
    if (state.id) update.mutate({ id: state.id, body }, done);
    else create.mutate({ ...body, name: state.name.trim() }, done);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{state.id ? 'Edit category' : 'New category'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input
              value={state.name}
              onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
              placeholder="Living Room"
            />
          </div>

          {!state.id && (
            <div className="space-y-1.5">
              <Label>Parent</Label>
              <select
                value={state.parentId}
                onChange={(e) => setState((s) => ({ ...s, parentId: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              >
                <option value="">None — top level</option>
                {parentOptions.map(({ category, depth }) => (
                  <option key={category.id} value={category.id}>
                    {'— '.repeat(depth)}
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Tile image</Label>
            <p className="text-xs text-muted-foreground">
              Shown on room/explore tiles in the storefront. Landscape ~1200×700
              works best.
            </p>
            {state.imageUrl ? (
              <div className="relative w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={state.imageUrl}
                  alt="Category tile"
                  className="h-28 rounded-md border object-cover"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute -right-2 -top-2 h-6 w-6 rounded-full shadow"
                  aria-label="Remove image"
                  onClick={() => setState((s) => ({ ...s, imageUrl: '' }))}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <FileUploader
                folder="categories"
                accept={{ 'image/*': [] }}
                maxFiles={1}
                onUploadComplete={(results) =>
                  results[0] && setState((s) => ({ ...s, imageUrl: results[0].url }))
                }
              />
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={state.isActive}
              onChange={(e) => setState((s) => ({ ...s, isActive: e.target.checked }))}
            />
            Active (visible on the storefront)
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={pending}>
              {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const { remove } = useCategoryMutations();
  const [editor, setEditor] = useState<EditorState | null>(null);

  const rows = flatten(categories);

  const onDelete = (category: Category) => {
    remove.mutate(category.id, {
      onSuccess: () => toast.success(`Removed “${category.name}”`),
      onError: (e: Error) => toast.error(e.message),
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Categories"
        description="The category tree, with the tile images themes use for room and collection browsing."
        actions={
          <Button onClick={() => setEditor(NEW)}>
            <Plus className="mr-1 h-4 w-4" /> New category
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No categories yet — create your first one.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map(({ category, depth }) => (
            <Card key={category.id}>
              <CardContent className="flex items-center justify-between gap-3 p-3">
                <div
                  className="flex min-w-0 items-center gap-3"
                  style={{ paddingLeft: depth * 24 }}
                >
                  <div className="flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded border bg-muted">
                    {category.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={category.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{category.name}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {category.slug}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={category.isActive ? 'success' : 'secondary'}>
                    {category.isActive ? 'Active' : 'Hidden'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Edit category"
                    onClick={() =>
                      setEditor({
                        id: category.id,
                        name: category.name,
                        parentId: '',
                        imageUrl: category.imageUrl ?? '',
                        isActive: category.isActive,
                      })
                    }
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete category"
                    onClick={() => onDelete(category)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editor && <CategoryDialog initial={editor} onClose={() => setEditor(null)} />}
    </div>
  );
}
