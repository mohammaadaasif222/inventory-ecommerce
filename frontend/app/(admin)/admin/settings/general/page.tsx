'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
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
import { useSetting, useUpsertSetting } from '@/hooks/use-config';

interface StoreSettings {
  name: string;
  currency: string;
  timezone: string;
  logoUrl: string;
  supportEmail: string;
}

const KEY = 'store.settings';

export default function GeneralSettingsPage() {
  const { data, isLoading } = useSetting<StoreSettings>(KEY);
  const upsert = useUpsertSetting();
  const { register, handleSubmit, reset } = useForm<StoreSettings>();

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  const submit = handleSubmit((values) =>
    upsert.mutate(
      { key: KEY, value: values, isPublic: true, section: 'general' },
      {
        onSuccess: () => toast.success('Settings saved'),
        onError: (e: Error) => toast.error(e.message),
      },
    ),
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="General" description="Store identity and defaults." />
      <form onSubmit={submit}>
        <Card>
          <CardHeader>
            <CardTitle>Store</CardTitle>
            <CardDescription>Exposed via the public /config endpoint.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Store name</Label>
              <Input {...register('name')} placeholder="My Store" />
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input {...register('currency')} placeholder="INR" maxLength={3} />
            </div>
            <div className="space-y-1.5">
              <Label>Timezone</Label>
              <Input {...register('timezone')} placeholder="Asia/Kolkata" />
            </div>
            <div className="space-y-1.5">
              <Label>Support email</Label>
              <Input {...register('supportEmail')} placeholder="help@store.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Logo URL</Label>
              <Input {...register('logoUrl')} />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" disabled={upsert.isPending}>
                {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
