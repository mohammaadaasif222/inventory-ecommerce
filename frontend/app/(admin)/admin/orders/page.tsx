'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ORDER_STATUSES,
  useOrders,
  useUpdateOrderStatus,
} from '@/hooks/use-orders';

const STATUS_VARIANT: Record<string, 'success' | 'secondary' | 'destructive' | 'outline'> = {
  DELIVERED: 'success',
  SHIPPED: 'secondary',
  PROCESSING: 'secondary',
  CONFIRMED: 'secondary',
  PENDING: 'outline',
  CANCELLED: 'destructive',
  RETURNED: 'destructive',
  REFUNDED: 'outline',
};

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useOrders({ page, limit: 15 });
  const update = useUpdateOrderStatus();
  const orders = data?.data ?? [];
  const meta = data?.meta;

  const onStatus = (id: string, status: string) =>
    update.mutate(
      { id, status },
      {
        onSuccess: () => toast.success(`Order moved to ${status}`),
        onError: (e: Error) => toast.error(e.message),
      },
    );

  return (
    <div className="space-y-6">
      <PageHeader title="Orders" description="Review orders and advance their status." />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Placed</TableHead>
              <TableHead className="text-right">Update</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No orders yet.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.orderNumber}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[o.status] ?? 'secondary'}>
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{o.paymentStatus}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {o.currency} {o.grandTotal.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(o.placedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <select
                      value={o.status}
                      onChange={(e) => onStatus(o.id, e.target.value)}
                      className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                    >
                      {ORDER_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {meta && meta.totalPages && meta.totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= (meta.totalPages ?? 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
