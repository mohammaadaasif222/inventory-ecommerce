'use client';

import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  POPUP_TYPES,
  usePopupMutations,
  usePopups,
} from '@/hooks/use-website';

export default function PopupsPage() {
  const { data: popups, isLoading } = usePopups();
  const { create, toggle, remove } = usePopupMutations();
  const [type, setType] = useState<string>(POPUP_TYPES[0]);
  const [title, setTitle] = useState('');

  const add = () => {
    if (!title.trim()) return toast.error('Enter a title');
    create.mutate(
      { type, title },
      {
        onSuccess: () => {
          setTitle('');
          toast.success('Popup created');
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Popups" description="Announcement bars, modals and cookie consent." />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-2 p-4">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              {POPUP_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 space-y-1.5">
            <label className="text-xs text-muted-foreground">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summer sale" />
          </div>
          <Button onClick={add} disabled={create.isPending}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !popups || popups.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No popups yet.</p>
      ) : (
        <div className="space-y-2">
          {popups.map((p) => (
            <Card key={p._id}>
              <CardContent className="flex items-center justify-between p-3">
                <div>
                  <p className="font-medium">{p.title || p.type}</p>
                  <Badge variant="outline" className="mt-1">{p.type}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.isActive ? 'success' : 'secondary'}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={() => toggle.mutate(p._id)}>
                    {p.isActive ? 'Disable' : 'Enable'}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove.mutate(p._id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
