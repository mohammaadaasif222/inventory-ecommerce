'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { config } from '@/lib/config';
import { useProducts } from '@/hooks/use-products';
import { useCategories, type Category } from '@/hooks/use-storefront';
import {
  useDeleteSeo,
  useGlobalSeo,
  useSaveSeo,
  useSeoEntries,
  type SeoMeta,
  type SeoScope,
} from '@/hooks/use-website';

// ── Global defaults ───────────────────────────────────────────────────────

interface SeoForm {
  title: string;
  description: string;
  keywords: string;
  ogImage: string;
  noindex: boolean;
}

function GlobalSeoCard() {
  const { data: seo, isLoading } = useGlobalSeo();
  const save = useSaveSeo();
  const { register, handleSubmit, reset } = useForm<SeoForm>();

  useEffect(() => {
    if (seo) {
      reset({
        title: seo.title ?? '',
        description: seo.description ?? '',
        keywords: (seo.keywords ?? []).join(', '),
        ogImage: seo.ogImage ?? '',
        noindex: seo.noindex ?? false,
      });
    }
  }, [seo, reset]);

  const submit = handleSubmit((v) =>
    save.mutate(
      {
        scope: 'global',
        title: v.title,
        description: v.description,
        keywords: v.keywords.split(',').map((k) => k.trim()).filter(Boolean),
        ogImage: v.ogImage,
        noindex: v.noindex,
      },
      {
        onSuccess: () => toast.success('SEO defaults saved'),
        onError: (e: Error) => toast.error(e.message),
      },
    ),
  );

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <Card>
        <CardHeader>
          <CardTitle>Global defaults</CardTitle>
          <CardDescription>Used when a page/product has no override.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Default title</Label>
            <Input {...register('title')} placeholder="My Store — Quality goods" />
          </div>
          <div className="space-y-1.5">
            <Label>Default description</Label>
            <Textarea rows={2} {...register('description')} />
          </div>
          <div className="space-y-1.5">
            <Label>Keywords (comma-separated)</Label>
            <Input {...register('keywords')} />
          </div>
          <div className="space-y-1.5">
            <Label>OG image URL</Label>
            <Input {...register('ogImage')} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('noindex')} />
            Discourage search engines (robots.txt disallow all)
          </label>
          <div className="flex justify-end">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

// ── Overrides ─────────────────────────────────────────────────────────────

function flattenCategories(nodes: Category[] | undefined, depth = 0): { id: string; label: string }[] {
  return (nodes ?? []).flatMap((c) => [
    { id: c.id, label: `${'— '.repeat(depth)}${c.name}` },
    ...flattenCategories(c.children, depth + 1),
  ]);
}

/** Search-as-you-type product picker; stores the chosen product's id. */
function ProductPicker({
  onPick,
  picked,
}: {
  onPick: (id: string, name: string) => void;
  picked: string | null;
}) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isFetching } = useProducts({ page: 1, limit: 8, search: debounced });
  const results = data?.data ?? [];

  return (
    <div className="space-y-2">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search products…"
      />
      {picked ? (
        <p className="text-xs text-muted-foreground">
          Selected: <span className="font-medium text-foreground">{picked}</span>
        </p>
      ) : null}
      {isFetching ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        results.length > 0 && (
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-1">
            {results.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onPick(p.id, p.name)}
                className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
              >
                {p.name}
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
}

const EMPTY_OVERRIDE: SeoMeta = {
  scope: 'product',
  entityId: '',
  title: '',
  description: '',
  keywords: [],
  ogImage: '',
  canonicalUrl: '',
  noindex: false,
};

function OverrideDialog({
  initial,
  onClose,
}: {
  /** Null = creating a new override. */
  initial: SeoMeta | null;
  onClose: () => void;
}) {
  const save = useSaveSeo();
  const { data: categories } = useCategories();
  const [entry, setEntry] = useState<SeoMeta>(initial ?? EMPTY_OVERRIDE);
  const [keywords, setKeywords] = useState((initial?.keywords ?? []).join(', '));
  const [pickedName, setPickedName] = useState<string | null>(null);
  const editing = !!initial;

  const patch = (next: Partial<SeoMeta>) => setEntry((e) => ({ ...e, ...next }));

  const onSave = () => {
    if (!entry.entityId?.trim()) {
      return toast.error('Choose what this override targets');
    }
    save.mutate(
      {
        ...entry,
        entityId: entry.entityId.trim(),
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      },
      {
        onSuccess: () => {
          toast.success('Override saved');
          onClose();
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit override' : 'Add override'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!editing && (
            <>
              <div className="space-y-1.5">
                <Label>Applies to</Label>
                <select
                  value={entry.scope}
                  onChange={(e) =>
                    patch({ scope: e.target.value as SeoScope, entityId: '' })
                  }
                  className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                >
                  <option value="product">A product</option>
                  <option value="category">A category</option>
                  <option value="page">A page</option>
                </select>
              </div>

              {entry.scope === 'product' && (
                <ProductPicker
                  picked={pickedName}
                  onPick={(id, name) => {
                    patch({ entityId: id });
                    setPickedName(name);
                  }}
                />
              )}
              {entry.scope === 'category' && (
                <select
                  value={entry.entityId ?? ''}
                  onChange={(e) => patch({ entityId: e.target.value })}
                  aria-label="Category"
                  className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                >
                  <option value="">Choose a category…</option>
                  {flattenCategories(categories).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              )}
              {entry.scope === 'page' && (
                <div className="space-y-1.5">
                  <Label>Page slug or path</Label>
                  <Input
                    value={entry.entityId ?? ''}
                    onChange={(e) => patch({ entityId: e.target.value })}
                    placeholder="about"
                  />
                </div>
              )}
            </>
          )}

          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={entry.title ?? ''}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="Overrides the generated title"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={entry.description ?? ''}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Keywords (comma-separated)</Label>
              <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>OG image URL</Label>
              <Input
                value={entry.ogImage ?? ''}
                onChange={(e) => patch({ ogImage: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Canonical URL</Label>
            <Input
              value={entry.canonicalUrl ?? ''}
              onChange={(e) => patch({ canonicalUrl: e.target.value })}
              placeholder="https://yourstore.com/products/…"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={entry.noindex ?? false}
              onChange={(e) => patch({ noindex: e.target.checked })}
            />
            Hide from search engines (noindex)
          </label>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onSave} disabled={save.isPending}>
              {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save override
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OverridesCard() {
  const { data: entries, isLoading } = useSeoEntries();
  const del = useDeleteSeo();
  const [dialog, setDialog] = useState<{ open: boolean; entry: SeoMeta | null }>({
    open: false,
    entry: null,
  });

  const overrides = (entries ?? []).filter((e) => e.scope !== 'global');

  const onDelete = (entry: SeoMeta) => {
    if (!entry._id) return;
    del.mutate(entry._id, {
      onSuccess: () => toast.success('Override removed'),
      onError: (e: Error) => toast.error(e.message),
    });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Page &amp; product overrides</CardTitle>
          <CardDescription>
            Per-product, per-category and per-page metadata that beats the defaults.
          </CardDescription>
        </div>
        <Button size="sm" onClick={() => setDialog({ open: true, entry: null })}>
          <Plus className="mr-1 h-4 w-4" /> Add override
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : overrides.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No overrides yet — the global defaults apply everywhere.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scope</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overrides.map((entry) => (
                <TableRow key={entry._id}>
                  <TableCell>
                    <Badge variant="outline">{entry.scope}</Badge>
                    {entry.noindex && (
                      <Badge variant="destructive" className="ml-1">
                        noindex
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-40 truncate font-mono text-xs">
                    {entry.entityId}
                  </TableCell>
                  <TableCell className="max-w-60 truncate text-sm">
                    {entry.title || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Edit override"
                      onClick={() => setDialog({ open: true, entry })}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete override"
                      onClick={() => onDelete(entry)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {dialog.open && (
        <OverrideDialog
          initial={dialog.entry}
          onClose={() => setDialog({ open: false, entry: null })}
        />
      )}
    </Card>
  );
}

export default function SeoPage() {
  const base = config.apiUrl.replace(/\/api$/, '');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="SEO"
        description="Metadata defaults plus per-product, per-category and per-page overrides. Sitemap & robots are generated automatically."
        actions={
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`${base}/sitemap.xml`} target="_blank" rel="noreferrer">
                sitemap.xml <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`${base}/robots.txt`} target="_blank" rel="noreferrer">
                robots.txt <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        }
      />

      <GlobalSeoCard />
      <OverridesCard />
    </div>
  );
}
