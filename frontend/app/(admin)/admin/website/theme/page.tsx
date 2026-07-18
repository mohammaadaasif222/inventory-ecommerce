'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ExternalLink,
  EyeOff,
  Loader2,
  RotateCcw,
  Undo2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FileUploader } from '@/components/upload/file-uploader';
import {
  useAdminSections,
  useCanRollback,
  useSyncThemes,
  useThemeMutations,
  useThemes,
} from '@/hooks/use-website';
import { useAuthStore } from '@/store/auth-store';
import { config as appConfig } from '@/lib/config';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api-client';
import { useCategories, type Category } from '@/hooks/use-storefront';
import { useBulkThemeVisibility } from '@/hooks/use-theme-visibility';
import { listSelectableThemes, listThemeConfigs } from '@/themes/catalog';
import { LAYOUT_DEFS } from '@/themes/layouts';
import {
  FONT_LABELS,
  FONT_KEYS,
  type ResolvedThemeConfig,
  type ThemeCustomizations,
} from '@/themes/config';
import { PREVIEW_PARAM } from '@/themes/runtime/theme-runtime';
import { cn } from '@/lib/utils';

/** Tokens the customiser exposes. The full set is too many knobs to be useful. */
const EDITABLE_COLORS = [
  { token: 'brand', label: 'Accent' },
  { token: 'background', label: 'Background' },
  { token: 'foreground', label: 'Text' },
  { token: 'primary', label: 'Buttons' },
] as const;

/**
 * Theme Manager.
 *
 * Three jobs on one screen: choose a theme, customise it against a live
 * preview, and undo a bad publish. The draft/publish split is the important
 * part — everything changed here streams to the preview tab over a socket and
 * touches nothing shoppers can see until Publish.
 */
export default function ThemeManagerPage() {
  const { data: themes, isLoading } = useThemes();
  const sync = useSyncThemes();
  const { activate, customize, rollback } = useThemeMutations();
  const { data: rollbackState } = useCanRollback();

  // One id per mount: it scopes the socket room, so two admins customising at
  // once never see each other's drafts.
  const sessionId = useMemo(
    () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    [],
  );

  const packages = useMemo(() => listSelectableThemes(), []);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<ThemeCustomizations>({});
  // Which palette the colour controls edit; both ship with every publish.
  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');

  // Reconcile the database with what is actually on disk. Dropping a folder in
  // themes/ and running `npm run themes:sync` is the whole install flow; this
  // is what tells the backend about it.
  const syncMutate = sync.mutate;
  const synced = useRef(false);
  useEffect(() => {
    if (synced.current) return;
    synced.current = true;

    syncMutate(
      listThemeConfigs().map((c) => ({
        slug: c.slug,
        name: c.name,
        version: c.version,
        description: c.description,
        extends: c.extends,
      })),
      { onError: (e: Error) => toast.error(`Theme sync failed: ${e.message}`) },
    );
  }, [syncMutate]);

  const active = themes?.find((t) => t.active);
  const editing = selected ?? active?.slug ?? packages[0]?.slug ?? null;
  const editingRecord = themes?.find((t) => t.slug === editing);
  const editingPkg = packages.find((p) => p.slug === editing);

  // Seed the draft from what is saved whenever the edited theme changes, so the
  // controls open showing reality rather than empty.
  useEffect(() => {
    setDraft(editingRecord?.customizations ?? {});
  }, [editingRecord?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const socket = usePreviewSocket(sessionId);

  /** Push a draft change to the preview tab without persisting it. */
  const patch = (next: ThemeCustomizations) => {
    const merged: ThemeCustomizations = {
      ...draft,
      ...next,
      colors: {
        light: { ...draft.colors?.light, ...next.colors?.light },
        dark: { ...draft.colors?.dark, ...next.colors?.dark },
      },
      fonts: { ...draft.fonts, ...next.fonts },
    };
    setDraft(merged);
    socket?.emit('preview_update', {
      sessionId,
      payload: { slug: editing, customizations: merged },
    });
  };

  const openPreview = () => {
    if (!editing) return;
    // A new tab rather than an inline iframe: the storefront's own breakpoints
    // decide the layout, and a narrow iframe would preview the mobile design
    // while the admin believes they are looking at desktop.
    window.open(`/?${PREVIEW_PARAM}=${sessionId}`, '_blank', 'noopener');
  };

  const doActivate = () => {
    if (!editing) return;
    activate.mutate(
      { slug: editing, customizations: draft },
      {
        onSuccess: () => toast.success('Theme published to the storefront'),
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  const [migration, setMigration] = useState<string | null>(null);

  /**
   * Publish, with the theme-switch migration in front when it matters.
   *
   * Switching to an *unrestricted* theme (no catalogScope) raises the
   * question restricted themes answer implicitly: should the other verticals'
   * products (perfume, home decor…) appear in this store? The dialog writes
   * per-theme visibility rows — nothing is ever deleted, and restricted
   * themes hide out-of-scope products by category automatically.
   */
  const publish = () => {
    if (!editing) return;
    const switching = editing !== active?.slug;
    const target = packages.find((p) => p.slug === editing);
    const hasVerticals = packages.some(
      (p) => p.slug !== editing && p.catalogScope,
    );
    if (switching && target && !target.catalogScope && hasVerticals) {
      setMigration(editing);
      return;
    }
    doActivate();
  };

  const saveOnly = () => {
    if (!editing) return;
    customize.mutate(
      { slug: editing, patch: draft },
      {
        onSuccess: () => toast.success('Customisations saved'),
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  const revert = () =>
    rollback.mutate(undefined, {
      onSuccess: () => toast.success('Reverted to the previous theme state'),
      onError: (e: Error) => toast.error(e.message),
    });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {migration && (
        <MigrationDialog
          targetSlug={migration}
          targetName={packages.find((p) => p.slug === migration)?.name ?? migration}
          verticals={packages.filter((p) => p.slug !== migration && p.catalogScope)}
          onProceed={doActivate}
          onClose={() => setMigration(null)}
        />
      )}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Theme</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Switch the storefront&apos;s design, customise it, and preview before
            publishing. A publish reaches live sessions in about a second — no
            deploy.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={revert}
          disabled={!rollbackState?.canRollback || rollback.isPending}
        >
          {rollback.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Undo2 className="mr-2 h-4 w-4" />
          )}
          Revert last change
        </Button>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {packages.map((pkg) => (
          <ThemeCard
            key={pkg.slug}
            name={pkg.name}
            description={pkg.description}
            version={pkg.version}
            swatch={pkg.preview.swatch}
            isActive={Boolean(themes?.find((t) => t.slug === pkg.slug)?.active)}
            isEditing={editing === pkg.slug}
            missing={!themes?.some((t) => t.slug === pkg.slug)}
            onSelect={() => setSelected(pkg.slug)}
          />
        ))}
      </section>

      {editing && editingPkg ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              Customise{' '}
              <span className="text-muted-foreground">{editingPkg.name}</span>
            </CardTitle>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={openPreview}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Preview
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={saveOnly}
                disabled={customize.isPending}
              >
                Save
              </Button>
              <Button size="sm" onClick={publish} disabled={activate.isPending}>
                {activate.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {editingRecord?.active ? 'Publish changes' : 'Activate'}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <Field
                label="Layout"
                hint="Arrangement is independent of the design — any theme pairs with any layout."
              >
                <div className="grid gap-2">
                  {LAYOUT_DEFS.map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => patch({ layoutPreset: l.id })}
                      className={cn(
                        'rounded-md border p-3 text-left text-sm transition-colors',
                        (draft.layoutPreset ?? editingPkg.layoutPreset) === l.id
                          ? 'border-primary bg-accent'
                          : 'hover:bg-accent/50',
                      )}
                    >
                      <span className="font-medium">{l.name}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {l.description}
                      </span>
                    </button>
                  ))}
                </div>
              </Field>

              <Field
                label="Default appearance"
                hint="A visitor's own light/dark toggle still wins."
              >
                <div className="flex gap-2">
                  {(['light', 'dark', 'system'] as const).map((m) => (
                    <Button
                      key={m}
                      type="button"
                      size="sm"
                      variant={
                        (draft.appearance ?? 'system') === m ? 'default' : 'outline'
                      }
                      onClick={() => patch({ appearance: m })}
                      className="capitalize"
                    >
                      {m}
                    </Button>
                  ))}
                </div>
              </Field>

              <Field
                label="Homepage sections"
                hint="Order for this theme only. Content is edited in Website → Homepage."
              >
                <SectionOrderEditor
                  order={draft.sectionOrder}
                  onChange={(sectionOrder) => patch({ sectionOrder })}
                />
              </Field>
            </div>

            <div className="space-y-6">
              <Field
                label="Colours"
                hint="Bare HSL, e.g. 36 46% 52%. Left blank, the theme's own palette is used."
              >
                <div className="mb-3 flex gap-2">
                  {(['light', 'dark'] as const).map((m) => (
                    <Button
                      key={m}
                      type="button"
                      size="sm"
                      variant={colorMode === m ? 'default' : 'outline'}
                      onClick={() => setColorMode(m)}
                      className="capitalize"
                    >
                      {m} palette
                    </Button>
                  ))}
                </div>
                <div className="grid gap-3">
                  {EDITABLE_COLORS.map(({ token, label }) => (
                    <ColorField
                      key={`${colorMode}-${token}`}
                      label={label}
                      value={draft.colors?.[colorMode]?.[token] ?? ''}
                      placeholder={editingPkg.tokens.colors[colorMode][token]}
                      onChange={(value) =>
                        patch({ colors: { [colorMode]: { [token]: value } } })
                      }
                    />
                  ))}
                </div>
              </Field>

              <Field label="Display font">
                <div className="flex flex-wrap gap-2">
                  {FONT_KEYS.map((key) => (
                    <Button
                      key={key}
                      type="button"
                      size="sm"
                      variant={
                        (draft.fonts?.display ?? editingPkg.tokens.fonts.display) ===
                        key
                          ? 'default'
                          : 'outline'
                      }
                      onClick={() => patch({ fonts: { display: key } })}
                    >
                      {FONT_LABELS[key]}
                    </Button>
                  ))}
                </div>
              </Field>

              <Field label="Logo" hint="Replaces the wordmark in the navbar.">
                {draft.logoUrl ? (
                  <div className="mb-2 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={draft.logoUrl}
                      alt="Current logo"
                      className="h-8 w-auto object-contain"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => patch({ logoUrl: '' })}
                    >
                      <RotateCcw className="mr-2 h-3 w-3" />
                      Use wordmark
                    </Button>
                  </div>
                ) : null}
                <FileUploader
                  folder="theme"
                  accept={{ 'image/*': [] }}
                  onUploadComplete={(results) => {
                    const url = results[0]?.url;
                    if (url) patch({ logoUrl: url });
                  }}
                />
              </Field>

              <Field label="Favicon" hint="Browser-tab icon; square images work best.">
                {draft.faviconUrl ? (
                  <div className="mb-2 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={draft.faviconUrl}
                      alt="Current favicon"
                      className="h-6 w-6 object-contain"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => patch({ faviconUrl: '' })}
                    >
                      <RotateCcw className="mr-2 h-3 w-3" />
                      Remove
                    </Button>
                  </div>
                ) : null}
                <FileUploader
                  folder="theme"
                  accept={{ 'image/*': [] }}
                  onUploadComplete={(results) => {
                    const url = results[0]?.url;
                    if (url) patch({ faviconUrl: url });
                  }}
                />
              </Field>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

/**
 * The customiser's socket.
 *
 * Joins its own preview room so drafts reach only this admin's preview tab. The
 * room is created on join, so opening the preview before or after connecting
 * both work.
 */
function usePreviewSocket(sessionId: string): Socket | null {
  const token = useAuthStore((s) => s.accessToken);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const s = io(`${appConfig.socketUrl}/theme`, {
      transports: ['websocket'],
      auth: { token },
    });
    s.on('connect', () => s.emit('join_preview', { sessionId }));
    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [sessionId, token]);

  return socket;
}

function ThemeCard({
  name,
  description,
  version,
  swatch,
  isActive,
  isEditing,
  missing,
  onSelect,
}: {
  name: string;
  description: string;
  version: string;
  swatch: { bg: string; fg: string; brand: string; muted: string };
  isActive: boolean;
  isEditing: boolean;
  missing: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'rounded-lg border p-4 text-left transition-shadow hover:shadow-sm',
        isEditing && 'ring-2 ring-primary',
      )}
    >
      {/* A swatch strip, not a screenshot: it renders from the theme's own
          tokens, so it cannot drift out of date the way a checked-in thumbnail
          would. */}
      <div
        className="mb-3 flex h-20 items-end gap-1.5 rounded-md border p-3"
        style={{ background: swatch.bg }}
      >
        <span className="h-6 flex-1 rounded" style={{ background: swatch.brand }} />
        <span className="h-4 w-6 rounded" style={{ background: swatch.muted }} />
        <span className="h-3 w-10 rounded" style={{ background: swatch.fg }} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{name}</span>
        {isActive && (
          <Badge variant="secondary" className="gap-1">
            <Check className="h-3 w-3" />
            Live
          </Badge>
        )}
        {missing && <Badge variant="outline">Not registered</Badge>}
      </div>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p>
      <p className="mt-2 text-[11px] text-muted-foreground">v{version}</p>
    </button>
  );
}

/**
 * Per-theme homepage section ordering.
 *
 * Reads the builder's sections and lets the admin reorder them *for this
 * theme* — the customization stores ids, the home templates apply it, and the
 * builder's own order stays the default for themes that never touch it.
 * Up/down buttons rather than drag: two sections is the common case, and
 * buttons stream cleanly through the same draft channel as every other
 * control (each click is one `patch`, previewable and undoable).
 */
function SectionOrderEditor({
  order,
  onChange,
}: {
  order: string[] | undefined;
  onChange: (order: string[]) => void;
}) {
  const { data: sections, isLoading } = useAdminSections();

  if (isLoading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }
  if (!sections || sections.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No homepage sections yet — add some in Website → Homepage first.
      </p>
    );
  }

  // Effective order: the draft's ranking first, unranked sections after in
  // builder order — mirroring exactly how the storefront templates resolve it.
  const rank = new Map((order ?? []).map((id, i) => [id, i]));
  const sorted = [...sections].sort(
    (a, b) =>
      (rank.get(a._id) ?? Number.MAX_SAFE_INTEGER) -
      (rank.get(b._id) ?? Number.MAX_SAFE_INTEGER),
  );

  const move = (from: number, to: number) => {
    if (to < 0 || to >= sorted.length) return;
    const ids = sorted.map((s) => s._id);
    [ids[from], ids[to]] = [ids[to], ids[from]];
    onChange(ids);
  };

  return (
    <ul className="space-y-1.5">
      {sorted.map((section, i) => (
        <li
          key={section._id}
          className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
        >
          <span className="flex-1 truncate">
            {section.title || section.type}
            {!section.isVisible && (
              <EyeOff
                className="ml-2 inline h-3 w-3 text-muted-foreground"
                aria-label="Hidden in the builder"
              />
            )}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={i === 0}
            onClick={() => move(i, i - 1)}
            aria-label={`Move ${section.title || section.type} up`}
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={i === sorted.length - 1}
            onClick={() => move(i, i + 1)}
            aria-label={`Move ${section.title || section.type} down`}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
        </li>
      ))}
    </ul>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {children}
    </div>
  );
}

function ColorField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="h-8 w-8 shrink-0 rounded border"
        style={{ background: `hsl(${value || placeholder})` }}
      />
      <div className="flex-1 space-y-1">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <Input
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 font-mono text-xs"
        />
      </div>
    </div>
  );
}

// ── Theme-switch migration ─────────────────────────────────────────────────

interface VerticalRow {
  scopeSlug: string;
  themeName: string;
  category: Category;
  count: number;
}

/**
 * The "include these products?" step when activating an unrestricted theme.
 *
 * For each vertical theme's scope category that actually holds products, the
 * admin chooses include (visibility overrides cleared) or hide (per-theme
 * hide rows written). Products are never deleted; a vertical theme always
 * shows its own catalog again the moment it is re-activated.
 */
function MigrationDialog({
  targetSlug,
  targetName,
  verticals,
  onProceed,
  onClose,
}: {
  targetSlug: string;
  targetName: string;
  verticals: ResolvedThemeConfig[];
  onProceed: () => void;
  onClose: () => void;
}) {
  const { data: categories } = useCategories();
  const bulk = useBulkThemeVisibility();
  const [rows, setRows] = useState<VerticalRow[] | null>(null);
  const [included, setIncluded] = useState<Record<string, boolean>>({});
  const [applying, setApplying] = useState(false);

  // Resolve each vertical's scope category and count its live products.
  useEffect(() => {
    if (!categories) return;
    let alive = true;

    const find = (nodes: Category[] | undefined, slug: string): Category | null => {
      for (const node of nodes ?? []) {
        if (node.slug === slug) return node;
        const hit = find(node.children, slug);
        if (hit) return hit;
      }
      return null;
    };

    const uniques = new Map<string, string>();
    for (const v of verticals) {
      if (v.catalogScope && !uniques.has(v.catalogScope)) {
        uniques.set(v.catalogScope, v.name);
      }
    }

    (async () => {
      const resolved: VerticalRow[] = [];
      for (const [scopeSlug, themeName] of uniques) {
        const category = find(categories, scopeSlug);
        if (!category) continue;
        try {
          const res = await api.getFull<unknown[]>('/products', {
            categoryId: category.id,
            status: 'ACTIVE',
            limit: 1,
          });
          const count = res.meta?.total ?? 0;
          if (count > 0) resolved.push({ scopeSlug, themeName, category, count });
        } catch {
          // Count failed: skip the row rather than block activation.
        }
      }
      if (!alive) return;
      setRows(resolved);
      setIncluded(Object.fromEntries(resolved.map((r) => [r.scopeSlug, true])));
    })();

    return () => {
      alive = false;
    };
  }, [categories, verticals]);

  // Nothing worth asking about → activate straight away.
  useEffect(() => {
    if (rows && rows.length === 0) {
      onProceed();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const confirm = async () => {
    if (!rows) return;
    setApplying(true);
    try {
      for (const row of rows) {
        await bulk.mutateAsync({
          themeSlug: targetSlug,
          categoryId: row.category.id,
          visible: included[row.scopeSlug] ?? true,
        });
      }
      onProceed();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Migration failed');
      setApplying(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !applying && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Activate {targetName}</DialogTitle>
        </DialogHeader>

        {!rows ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {targetName} shows every category. Choose whether products from
              your vertical themes should appear in it — nothing is deleted
              either way, and each vertical theme always shows its own products
              again when re-activated.
            </p>

            <div className="space-y-2">
              {rows.map((row) => (
                <label
                  key={row.scopeSlug}
                  className="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover:border-brand/40"
                >
                  <input
                    type="checkbox"
                    checked={included[row.scopeSlug] ?? true}
                    onChange={(e) =>
                      setIncluded((prev) => ({
                        ...prev,
                        [row.scopeSlug]: e.target.checked,
                      }))
                    }
                    className="mt-0.5 h-4 w-4"
                  />
                  <span>
                    <span className="block text-sm font-medium">
                      Include {row.count} {row.category.name}{' '}
                      {row.count === 1 ? 'product' : 'products'}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      From the {row.themeName} theme&apos;s catalog — unchecked,
                      they stay hidden in {targetName} (never deleted).
                    </span>
                  </span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={applying}>
                Cancel
              </Button>
              <Button onClick={confirm} disabled={applying}>
                {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Apply &amp; activate
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
