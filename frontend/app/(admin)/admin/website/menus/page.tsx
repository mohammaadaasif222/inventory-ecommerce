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
import { useSetting, useUpsertSetting } from '@/hooks/use-config';

interface MenuItem {
  label: string;
  href: string;
}

export default function MenusPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Menus" description="Header and footer navigation." />
      <MenuEditor configKey="menu.header" title="Header menu" />
      <MenuEditor configKey="menu.footer" title="Footer menu" />
    </div>
  );
}

function MenuEditor({ configKey, title }: { configKey: string; title: string }) {
  const { data, isLoading } = useSetting<MenuItem[]>(configKey);
  const upsert = useUpsertSetting();
  const [items, setItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    if (data) setItems(data);
  }, [data]);

  const save = () =>
    upsert.mutate(
      { key: configKey, value: items, isPublic: true },
      {
        onSuccess: () => toast.success(`${title} saved`),
        onError: (e: Error) => toast.error(e.message),
      },
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Links shown in the {title.toLowerCase()}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <>
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  placeholder="Label"
                  value={item.label}
                  onChange={(e) =>
                    setItems((arr) =>
                      arr.map((it, j) => (j === i ? { ...it, label: e.target.value } : it)),
                    )
                  }
                />
                <Input
                  placeholder="/path"
                  value={item.href}
                  onChange={(e) =>
                    setItems((arr) =>
                      arr.map((it, j) => (j === i ? { ...it, href: e.target.value } : it)),
                    )
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setItems((arr) => arr.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setItems((arr) => [...arr, { label: '', href: '' }])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add link
              </Button>
              <Button size="sm" onClick={save} disabled={upsert.isPending}>
                {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
