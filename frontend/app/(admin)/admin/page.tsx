'use client';

import {
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Ticket,
  Loader2,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RevenueChart } from '@/components/charts/revenue-chart';
import { useDashboard, useRevenueSeries } from '@/hooks/use-analytics';

export default function AdminDashboard() {
  const { data, isLoading } = useDashboard();
  const { data: revenue } = useRevenueSeries('day');

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading metrics…
      </div>
    );
  }

  const kpis = [
    {
      label: 'Revenue (30d)',
      value: `₹${data.sales.revenue.toLocaleString()}`,
      hint: `${data.sales.orders} orders · AOV ₹${data.sales.avgOrderValue}`,
      icon: DollarSign,
    },
    {
      label: 'Items sold',
      value: data.sales.itemsSold.toLocaleString(),
      hint: `${data.chat.active} active chats`,
      icon: ShoppingCart,
    },
    {
      label: 'Low / out of stock',
      value: `${data.inventory.lowStock} / ${data.inventory.outOfStock}`,
      hint: `${data.inventory.deadStock} dead-stock SKUs`,
      icon: AlertTriangle,
    },
    {
      label: 'Open tickets',
      value: data.support.open.toLocaleString(),
      hint: `${data.support.breached} SLA breaches`,
      icon: Ticket,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Live metrics across the last 30 days." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardDescription>{kpi.label}</CardDescription>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.value}</div>
                <p className="text-xs text-muted-foreground">{kpi.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Daily revenue over the period.</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenue ?? []} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders by status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(data.orderStatus).length === 0 ? (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              Object.entries(data.orderStatus).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <Badge variant="secondary">{status}</Badge>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
