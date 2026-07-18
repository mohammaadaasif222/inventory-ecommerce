'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { RevenueChart } from '@/components/charts/revenue-chart';
import { config } from '@/lib/config';
import { useAuthStore } from '@/store/auth-store';
import { useDashboard, useRevenueSeries } from '@/hooks/use-analytics';

type Granularity = 'day' | 'week' | 'month';

export default function AnalyticsPage() {
  const [granularity, setGranularity] = useState<Granularity>('day');
  const { data, isLoading } = useDashboard();
  const { data: revenue } = useRevenueSeries(granularity);

  const downloadCsv = () => {
    const token = useAuthStore.getState().accessToken;
    // Open the CSV report with the bearer token via fetch → blob.
    fetch(`${config.apiUrl}/analytics/reports/sales.csv`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sales-report.csv';
        a.click();
        URL.revokeObjectURL(url);
      });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Sales, inventory and support insights."
        actions={
          <Button variant="outline" onClick={downloadCsv}>
            Export sales CSV
          </Button>
        }
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Trend over time.</CardDescription>
          </div>
          <div className="flex gap-1">
            {(['day', 'week', 'month'] as Granularity[]).map((g) => (
              <Button
                key={g}
                size="sm"
                variant={granularity === g ? 'default' : 'outline'}
                onClick={() => setGranularity(g)}
              >
                {g}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <RevenueChart data={revenue ?? []} />
        </CardContent>
      </Card>

      {isLoading || !data ? (
        <div className="flex h-32 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard
            title="Inventory health"
            rows={[
              ['Total SKUs', data.inventory.totalSkus],
              ['Low stock', data.inventory.lowStock],
              ['Out of stock', data.inventory.outOfStock],
              ['Dead stock', data.inventory.deadStock],
              ['Turnover rate', data.inventory.turnoverRate],
            ]}
          />
          <MetricCard
            title="Support"
            rows={[
              ['Open tickets', data.support.open],
              ['SLA breaches', data.support.breached],
              ['Avg resolution (min)', data.support.avgResolutionMinutes],
            ]}
          />
          <MetricCard
            title="Chat"
            rows={[
              ['Total chats', data.chat.total],
              ['Active', data.chat.active],
              ['Closed', data.chat.closed],
            ]}
          />
        </div>
      )}
    </div>
  );
}

function MetricCard({
  title,
  rows,
}: {
  title: string;
  rows: [string, number][];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{value}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
