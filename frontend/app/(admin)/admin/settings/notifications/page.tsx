'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
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
  NOTIFICATION_CHANNELS,
  useNotificationLogs,
  useTemplates,
  useUpsertTemplate,
} from '@/hooks/use-notifications-admin';

export default function NotificationsSettingsPage() {
  const templates = useTemplates();
  const logs = useNotificationLogs();
  const upsert = useUpsertTemplate();

  const [form, setForm] = useState({
    key: '',
    channel: 'EMAIL',
    subject: '',
    body: '',
  });

  const save = () => {
    if (!form.key.trim() || !form.body.trim()) {
      return toast.error('Key and body are required');
    }
    upsert.mutate(form, {
      onSuccess: () => {
        toast.success('Template saved');
        setForm({ key: '', channel: 'EMAIL', subject: '', body: '' });
      },
      onError: (e: Error) => toast.error(e.message),
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Notifications" description="Channel templates (Handlebars) and delivery logs." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Templates</CardTitle>
          <CardDescription>
            Use Handlebars placeholders like{' '}
            <code className="rounded bg-muted px-1">{'{{orderNumber}}'}</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {templates.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (templates.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No templates yet.</p>
          ) : (
            (templates.data ?? []).map((t) => (
              <div key={t.key} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span className="font-mono text-xs">{t.key}</span>
                <Badge variant="outline">{t.channel}</Badge>
              </div>
            ))
          )}

          <div className="grid gap-2 border-t pt-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Key</Label>
              <Input
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                placeholder="order.confirmed"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Channel</Label>
              <select
                value={form.channel}
                onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
                className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              >
                {NOTIFICATION_CHANNELS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Subject (email)</Label>
              <Input
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Body</Label>
              <Textarea
                rows={3}
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button onClick={save} disabled={upsert.isPending}>
                <Plus className="mr-1 h-4 w-4" /> Save template
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent deliveries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          {logs.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (logs.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No notifications sent yet.</p>
          ) : (
            (logs.data ?? []).slice(0, 15).map((l) => (
              <div key={l._id} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {l.channel} → {l.to} ({l.templateKey})
                </span>
                <Badge variant={l.status === 'SENT' ? 'success' : l.status === 'FAILED' ? 'destructive' : 'secondary'}>
                  {l.status}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
