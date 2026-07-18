'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useSetting, useUpsertSetting } from '@/hooks/use-config';

interface PaymentPrefs {
  defaultProvider: 'COD' | 'RAZORPAY' | 'STRIPE';
  codEnabled: boolean;
}
const KEY = 'payments.settings';

export default function PaymentsSettingsPage() {
  const { data, isLoading } = useSetting<PaymentPrefs>(KEY);
  const upsert = useUpsertSetting();
  const { register, handleSubmit, reset } = useForm<PaymentPrefs>({
    defaultValues: { defaultProvider: 'COD', codEnabled: true },
  });

  useEffect(() => {
    if (data) reset(data);
  }, [data, reset]);

  const submit = handleSubmit((v) =>
    upsert.mutate(
      { key: KEY, value: v, isPublic: false, section: 'general' },
      {
        onSuccess: () => toast.success('Payment preferences saved'),
        onError: (e: Error) => toast.error(e.message),
      },
    ),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Payments" description="Gateways and checkout preferences." />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Gateway credentials are environment-managed</AlertTitle>
        <AlertDescription>
          Razorpay & Stripe keys and webhook secrets are set via env vars
          (<code className="rounded bg-muted px-1">RAZORPAY_*</code>,{' '}
          <code className="rounded bg-muted px-1">STRIPE_*</code>) and verified by
          HMAC at the webhook endpoints. COD requires no gateway. Use the form
          below for non-secret checkout preferences.
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <form onSubmit={submit}>
          <Card>
            <CardHeader>
              <CardTitle>Checkout preferences</CardTitle>
              <CardDescription>Defaults shown to customers at checkout.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Default provider</Label>
                <select
                  {...register('defaultProvider')}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="COD">Cash on delivery</option>
                  <option value="RAZORPAY">Razorpay</option>
                  <option value="STRIPE">Stripe</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register('codEnabled')} />
                Allow cash on delivery
              </label>
              <div className="flex justify-end">
                <Button type="submit" disabled={upsert.isPending}>
                  {upsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
