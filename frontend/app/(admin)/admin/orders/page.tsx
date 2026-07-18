'use client';

import { useState } from 'react';
import { Loader2, Plus, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
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
  type Order,
} from '@/hooks/use-orders';
import {
  SHIPMENT_STATUSES,
  SHIPMENT_STATUS_LABELS,
  useShipments,
  useShipmentMutations,
  type Shipment,
  type ShipmentStatus,
} from '@/hooks/use-shipping';

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

const SHIPMENT_VARIANT: Record<ShipmentStatus, 'success' | 'secondary' | 'destructive'> = {
  CREATED: 'secondary',
  LABEL_GENERATED: 'secondary',
  IN_TRANSIT: 'secondary',
  OUT_FOR_DELIVERY: 'secondary',
  DELIVERED: 'success',
  FAILED: 'destructive',
  RETURNED: 'destructive',
};

/** One shipment row in the dialog: status control, note, and its timeline. */
function ShipmentRow({ shipment }: { shipment: Shipment }) {
  const { updateStatus } = useShipmentMutations();
  const [note, setNote] = useState('');

  const onStatus = (status: ShipmentStatus) =>
    updateStatus.mutate(
      { id: shipment.id, body: { status, note: note.trim() || undefined } },
      {
        onSuccess: () => {
          setNote('');
          toast.success(`Shipment marked ${SHIPMENT_STATUS_LABELS[status]}`);
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm">
          <Truck className="h-4 w-4 text-brand" />
          <span className="font-medium">{shipment.carrier}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {shipment.trackingNumber ?? 'no tracking number'}
          </span>
        </p>
        <Badge variant={SHIPMENT_VARIANT[shipment.status]}>
          {SHIPMENT_STATUS_LABELS[shipment.status]}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={shipment.status}
          onChange={(e) => onStatus(e.target.value as ShipmentStatus)}
          disabled={updateStatus.isPending}
          aria-label="Shipment status"
          className="h-8 rounded-md border border-input bg-transparent px-2 text-xs"
        >
          {SHIPMENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {SHIPMENT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Checkpoint note (optional, saved with next status change)"
          className="h-8 flex-1 text-xs"
        />
      </div>

      {shipment.events.length > 0 && (
        <ol className="space-y-1 border-l pl-3 text-xs text-muted-foreground">
          {[...shipment.events].reverse().map((event) => (
            <li key={event.id}>
              <span className="font-medium text-foreground">
                {SHIPMENT_STATUS_LABELS[event.status]}
              </span>
              {event.note ? ` — ${event.note}` : ''}
              <span className="ml-1 text-muted-foreground/70">
                · {new Date(event.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ShipmentsDialog({
  order,
  onClose,
}: {
  order: Order;
  onClose: () => void;
}) {
  const { data: shipments, isLoading } = useShipments(order.id);
  const { create } = useShipmentMutations();
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  const onCreate = () => {
    if (!carrier.trim()) return toast.error('Enter a carrier');
    create.mutate(
      {
        orderId: order.id,
        carrier: carrier.trim(),
        trackingNumber: trackingNumber.trim() || undefined,
      },
      {
        onSuccess: () => {
          setCarrier('');
          setTrackingNumber('');
          toast.success('Shipment created');
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Shipments — {order.orderNumber}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs text-muted-foreground">Carrier</label>
            <Input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="Delhivery, Shiprocket…"
              className="h-9"
            />
          </div>
          <div className="flex-1 space-y-1.5">
            <label className="text-xs text-muted-foreground">Tracking number</label>
            <Input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="AWB123456789 (optional)"
              className="h-9"
            />
          </div>
          <Button size="sm" onClick={onCreate} disabled={create.isPending}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>

        <Separator />

        {isLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !shipments || shipments.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No shipments yet — add one above to start tracking.
          </p>
        ) : (
          <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {shipments.map((s) => (
              <ShipmentRow key={s.id} shipment={s} />
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function OrdersPage() {
  const [page, setPage] = useState(1);
  const [shipmentsFor, setShipmentsFor] = useState<Order | null>(null);
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
      <PageHeader
        title="Orders"
        description="Review orders, advance their status and manage shipment tracking."
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Placed</TableHead>
              <TableHead className="text-right">Shipments</TableHead>
              <TableHead className="text-right">Update</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShipmentsFor(o)}
                    >
                      <Truck className="mr-1.5 h-3.5 w-3.5" /> Manage
                    </Button>
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

      {shipmentsFor && (
        <ShipmentsDialog order={shipmentsFor} onClose={() => setShipmentsFor(null)} />
      )}
    </div>
  );
}
