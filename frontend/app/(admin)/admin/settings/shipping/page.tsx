'use client';

import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/page-header';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useMethods,
  useShippingMutations,
  useZones,
} from '@/hooks/use-shipping';

export default function ShippingSettingsPage() {
  const zones = useZones();
  const methods = useMethods();
  const { createZone, createMethod } = useShippingMutations();

  const [zoneName, setZoneName] = useState('');
  const [countries, setCountries] = useState('IN');

  const [methodForm, setMethodForm] = useState({
    zoneId: '',
    name: '',
    carrier: 'GENERIC',
    rateType: 'FLAT',
    baseRate: 0,
    estimatedDays: 5,
  });

  const addZone = () => {
    if (!zoneName.trim()) return;
    createZone.mutate(
      { name: zoneName, countries: countries.split(',').map((c) => c.trim().toUpperCase()) },
      {
        onSuccess: () => {
          setZoneName('');
          toast.success('Zone created');
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  const addMethod = () => {
    if (!methodForm.zoneId || !methodForm.name.trim()) {
      return toast.error('Pick a zone and name the method');
    }
    createMethod.mutate(
      { ...methodForm, baseRate: Number(methodForm.baseRate), estimatedDays: Number(methodForm.estimatedDays) },
      {
        onSuccess: () => toast.success('Method created'),
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Shipping" description="Zones, methods and rates." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Zones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {zones.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            (zones.data ?? []).map((z) => (
              <div key={z.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span className="font-medium">{z.name}</span>
                <span className="text-xs text-muted-foreground">{z.countries.join(', ')}</span>
              </div>
            ))
          )}
          <div className="flex items-end gap-2 border-t pt-3">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Zone name</Label>
              <Input value={zoneName} onChange={(e) => setZoneName(e.target.value)} placeholder="India" />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Countries (CSV)</Label>
              <Input value={countries} onChange={(e) => setCountries(e.target.value)} />
            </div>
            <Button onClick={addZone} disabled={createZone.isPending}>
              <Plus className="mr-1 h-4 w-4" /> Zone
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {methods.isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            (methods.data ?? []).map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                <span className="font-medium">{m.name}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{m.rateType}</Badge>
                  <span className="text-xs text-muted-foreground">
                    base {m.baseRate} · ~{m.estimatedDays}d
                  </span>
                </div>
              </div>
            ))
          )}
          <div className="grid gap-2 border-t pt-3 sm:grid-cols-2">
            <select
              value={methodForm.zoneId}
              onChange={(e) => setMethodForm((f) => ({ ...f, zoneId: e.target.value }))}
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              <option value="">Select zone…</option>
              {(zones.data ?? []).map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
            <Input
              placeholder="Method name (Standard)"
              value={methodForm.name}
              onChange={(e) => setMethodForm((f) => ({ ...f, name: e.target.value }))}
            />
            <select
              value={methodForm.rateType}
              onChange={(e) => setMethodForm((f) => ({ ...f, rateType: e.target.value }))}
              className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
            >
              <option value="FLAT">Flat</option>
              <option value="WEIGHT">By weight</option>
              <option value="PRICE">Free above threshold</option>
            </select>
            <Input
              type="number"
              placeholder="Base rate"
              value={methodForm.baseRate}
              onChange={(e) => setMethodForm((f) => ({ ...f, baseRate: Number(e.target.value) }))}
            />
            <div className="sm:col-span-2 flex justify-end">
              <Button onClick={addMethod} disabled={createMethod.isPending}>
                <Plus className="mr-1 h-4 w-4" /> Method
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
