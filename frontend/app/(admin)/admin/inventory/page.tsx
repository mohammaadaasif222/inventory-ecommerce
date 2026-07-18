'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Loader2, Search, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useAdjustStock,
  useStock,
  useWarehouses,
  type AdjustStockInput,
  type StockItem,
} from '@/hooks/use-inventory';

export default function InventoryPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [lowOnly, setLowOnly] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [preset, setPreset] = useState<Partial<StockItem> | null>(null);

  const { data: warehouses } = useWarehouses();
  const { data, isLoading } = useStock({ page, limit: 15, search, lowOnly });
  const items = data?.data ?? [];
  const meta = data?.meta;

  const warehouseName = (id: string) =>
    warehouses?.find((w) => w.id === id)?.code ?? id.slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory"
        description="Stock levels per SKU per warehouse, with adjustments logged to the movement ledger."
        actions={
          <Button
            onClick={() => {
              setPreset(null);
              setAdjustOpen(true);
            }}
          >
            <SlidersHorizontal className="mr-1 h-4 w-4" /> Adjust stock
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search SKU…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-8"
          />
        </div>
        <Button
          variant={lowOnly ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setLowOnly((v) => !v);
            setPage(1);
          }}
        >
          Low stock only
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Warehouse</TableHead>
              <TableHead className="text-right">On hand</TableHead>
              <TableHead className="text-right">Reserved</TableHead>
              <TableHead className="text-right">Available</TableHead>
              <TableHead className="text-right">Threshold</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  No stock records. Use “Adjust stock” to receive inventory.
                </TableCell>
              </TableRow>
            ) : (
              items.map((it) => {
                const available = it.quantity - it.reserved;
                const low = it.quantity <= it.lowStockThreshold;
                return (
                  <TableRow key={it.id}>
                    <TableCell className="font-mono text-xs">{it.sku}</TableCell>
                    <TableCell>{warehouseName(it.warehouseId)}</TableCell>
                    <TableCell className="text-right">{it.quantity}</TableCell>
                    <TableCell className="text-right">{it.reserved}</TableCell>
                    <TableCell className="text-right">
                      {low ? (
                        <Badge variant="destructive">{available}</Badge>
                      ) : (
                        available
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {it.lowStockThreshold}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPreset(it);
                          setAdjustOpen(true);
                        }}
                      >
                        Adjust
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {meta && meta.totalPages && meta.totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <span className="text-sm text-muted-foreground">
            Page {meta.page} of {meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
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

      <AdjustStockDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        warehouses={warehouses ?? []}
        preset={preset}
      />
    </div>
  );
}

function AdjustStockDialog({
  open,
  onOpenChange,
  warehouses,
  preset,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  warehouses: { id: string; code: string; name: string }[];
  preset: Partial<StockItem> | null;
}) {
  const adjust = useAdjustStock();
  const { register, handleSubmit, reset } = useForm<AdjustStockInput>({
    defaultValues: {
      sku: preset?.sku ?? '',
      warehouseId: preset?.warehouseId ?? warehouses[0]?.id ?? '',
      type: 'INBOUND',
      quantity: 1,
      reason: '',
    },
  });

  // Re-seed the form whenever the dialog opens (optionally from a row preset).
  useEffect(() => {
    if (open) {
      reset({
        sku: preset?.sku ?? '',
        warehouseId: preset?.warehouseId ?? warehouses[0]?.id ?? '',
        type: 'INBOUND',
        quantity: 1,
        reason: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, preset]);

  const submit = handleSubmit((values) => {
    adjust.mutate(
      { ...values, quantity: Number(values.quantity) },
      {
        onSuccess: () => {
          toast.success('Stock adjusted');
          onOpenChange(false);
        },
        onError: (e: Error) => toast.error(e.message),
      },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            Creates a movement-ledger entry and updates the on-hand quantity.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>SKU</Label>
            <Input {...register('sku')} placeholder="TSHIRT-M-RED-8F3A" />
          </div>
          <div className="space-y-1.5">
            <Label>Warehouse</Label>
            <select
              {...register('warehouseId')}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <select
                {...register('type')}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
              >
                <option value="INBOUND">Inbound (+)</option>
                <option value="OUTBOUND">Outbound (-)</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantity</Label>
              <Input type="number" min={1} {...register('quantity')} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reason (optional)</Label>
            <Input {...register('reason')} placeholder="Stocktake correction" />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={adjust.isPending}>
              {adjust.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Apply
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
