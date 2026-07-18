'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Loader2, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth-store';
import { useLogout } from '@/hooks/use-auth';
import {
  useMyOrders,
  useProfile,
  useUpdateProfile,
} from '@/hooks/use-account';
import { cn } from '@/lib/utils';
import { useLayout } from '@/themes/runtime/theme-runtime';
import type { AccountTemplateProps } from '@/themes/contract';

export default function AccountTemplate(_props: AccountTemplateProps) {
  const router = useRouter();
  const layout = useLayout();
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const { data: orders } = useMyOrders();

  const { register, handleSubmit, reset } = useForm<{
    firstName: string;
    lastName: string;
    phone: string;
  }>();

  useEffect(() => {
    if (!user) router.replace('/login?redirect=/account');
  }, [user, router]);

  useEffect(() => {
    if (profile) {
      reset({
        firstName: profile.firstName ?? '',
        lastName: profile.lastName ?? '',
        phone: profile.phone ?? '',
      });
    }
  }, [profile, reset]);

  if (!user) return null;

  const save = handleSubmit((values) =>
    update.mutate(values, {
      onSuccess: () => toast.success('Profile updated'),
      onError: (e: Error) => toast.error(e.message),
    }),
  );

  return (
    <div className={cn(layout.container, 'max-w-3xl space-y-6 py-8')}>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium tracking-tight">
          My account
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => logout.mutate(undefined, { onSuccess: () => router.push('/') })}
        >
          Sign out
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>First name</Label>
              <Input {...register('firstName')} />
            </div>
            <div className="space-y-1.5">
              <Label>Last name</Label>
              <Input {...register('lastName')} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input {...register('phone')} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={profile?.email ?? user.email} disabled />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={update.isPending}>
                {update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!orders || orders.data.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No orders yet.
            </p>
          ) : (
            orders.data.map((o) => (
              <Link
                key={o.id}
                href={`/orders/${o.id}`}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-mono text-sm">{o.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.placedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm">
                    {o.currency} {o.grandTotal.toFixed(2)}
                  </span>
                  <Badge variant="secondary">{o.status}</Badge>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
