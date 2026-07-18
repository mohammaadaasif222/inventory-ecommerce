'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  FOOTER_SETTINGS_KEY,
  useSetting,
  useUpsertSetting,
  type FooterColumn,
  type FooterSettings,
} from '@/hooks/use-config';

const SOCIALS = [
  { key: 'facebook', label: 'Facebook URL', placeholder: 'https://facebook.com/yourpage' },
  { key: 'twitter', label: 'Twitter / X URL', placeholder: 'https://x.com/yourhandle' },
  { key: 'instagram', label: 'Instagram URL', placeholder: 'https://instagram.com/yourhandle' },
  { key: 'youtube', label: 'YouTube URL', placeholder: 'https://youtube.com/@yourchannel' },
] as const;

const EMPTY: FooterSettings = {
  aboutText: '',
  copyrightText: '',
  socials: {},
  columns: [
    { title: 'Quick Links', links: [] },
    { title: 'Explore', links: [] },
    { title: 'Help', links: [] },
  ],
  showPaymentBadges: true,
};

export default function FooterSettingsPage() {
  const { data, isLoading } = useSetting<FooterSettings>(FOOTER_SETTINGS_KEY);
  const upsert = useUpsertSetting();
  const [settings, setSettings] = useState<FooterSettings>(EMPTY);

  useEffect(() => {
    if (data) {
      setSettings({
        ...EMPTY,
        ...data,
        socials: { ...data.socials },
        columns: data.columns?.length ? data.columns : EMPTY.columns,
      });
    }
  }, [data]);

  const patch = (next: Partial<FooterSettings>) =>
    setSettings((s) => ({ ...s, ...next }));

  const patchColumn = (index: number, next: Partial<FooterColumn>) =>
    setSettings((s) => ({
      ...s,
      columns: (s.columns ?? []).map((c, i) => (i === index ? { ...c, ...next } : c)),
    }));

  const save = () =>
    upsert.mutate(
      { key: FOOTER_SETTINGS_KEY, value: settings, isPublic: true },
      {
        onSuccess: () => toast.success('Footer saved — live on the storefront'),
        onError: (e: Error) => toast.error(e.message),
      },
    );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Footer"
        description="Footer text, link columns and social profiles shown on the storefront."
        actions={
          <Button onClick={save} disabled={upsert.isPending}>
            {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save footer
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Brand block</CardTitle>
          <CardDescription>The short text under your logo, and the bottom bar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>About text</Label>
            <Textarea
              rows={2}
              value={settings.aboutText ?? ''}
              onChange={(e) => patch({ aboutText: e.target.value })}
              placeholder="Every bottle leaves the atelier sealed and cased for transit…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Copyright line</Label>
            <Input
              value={settings.copyrightText ?? ''}
              onChange={(e) => patch({ copyrightText: e.target.value })}
              placeholder="Copyright © {year} {store} — leave empty for the default"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.showPaymentBadges ?? true}
              onChange={(e) => patch({ showPaymentBadges: e.target.checked })}
            />
            Show payment badges (VISA, Mastercard…)
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Social profiles</CardTitle>
          <CardDescription>
            Icons appear in the footer only for the profiles you fill in.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {SOCIALS.map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <Label>{label}</Label>
              <Input
                type="url"
                value={settings.socials?.[key] ?? ''}
                onChange={(e) =>
                  patch({ socials: { ...settings.socials, [key]: e.target.value } })
                }
                placeholder={placeholder}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {(settings.columns ?? []).map((column, ci) => (
        <Card key={ci}>
          <CardHeader>
            <CardTitle className="text-base">Link column {ci + 1}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Column title</Label>
              <Input
                value={column.title}
                onChange={(e) => patchColumn(ci, { title: e.target.value })}
                placeholder="Quick Links"
              />
            </div>
            {column.links.map((link, li) => (
              <div key={li} className="flex items-end gap-2">
                <div className="flex-1 space-y-1.5">
                  {li === 0 && <Label className="text-xs">Label</Label>}
                  <Input
                    value={link.label}
                    onChange={(e) =>
                      patchColumn(ci, {
                        links: column.links.map((l, i) =>
                          i === li ? { ...l, label: e.target.value } : l,
                        ),
                      })
                    }
                    placeholder="All Products"
                  />
                </div>
                <div className="flex-1 space-y-1.5">
                  {li === 0 && <Label className="text-xs">Link</Label>}
                  <Input
                    value={link.href}
                    onChange={(e) =>
                      patchColumn(ci, {
                        links: column.links.map((l, i) =>
                          i === li ? { ...l, href: e.target.value } : l,
                        ),
                      })
                    }
                    placeholder="/products or https://…"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Remove link"
                  onClick={() =>
                    patchColumn(ci, { links: column.links.filter((_, i) => i !== li) })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                patchColumn(ci, { links: [...column.links, { label: '', href: '' }] })
              }
            >
              <Plus className="mr-1 h-4 w-4" /> Add link
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
