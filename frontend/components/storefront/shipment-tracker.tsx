'use client';

import { useState } from 'react';
import { Check, Circle, Copy, Truck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import {
  SHIPMENT_JOURNEY,
  SHIPMENT_STATUS_LABELS,
  type ShipmentStatus,
} from '@/hooks/use-shipping';
import { cn } from '@/lib/utils';

export interface TrackableShipment {
  carrier: string;
  trackingNumber: string | null;
  status: ShipmentStatus;
  events: { status: ShipmentStatus; note: string | null; createdAt: string }[];
}

/**
 * One shipment's journey: carrier and tracking number up top, the five-stage
 * stepper, and the checkpoint timeline beneath. Shared by the customer's
 * order page and the public /track page — they differ only in how they fetch.
 */
export function ShipmentTracker({ shipment }: { shipment: TrackableShipment }) {
  const [copied, setCopied] = useState(false);
  const journeyIdx = SHIPMENT_JOURNEY.indexOf(shipment.status);
  const exception = shipment.status === 'FAILED' || shipment.status === 'RETURNED';

  const copy = async () => {
    if (!shipment.trackingNumber) return;
    try {
      await navigator.clipboard.writeText(shipment.trackingNumber);
      setCopied(true);
      toast.success('Tracking number copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast(`Tracking number: ${shipment.trackingNumber}`);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm">
          <Truck className="h-4 w-4 text-brand" />
          <span className="font-medium">{shipment.carrier}</span>
          {shipment.trackingNumber ? (
            <button
              type="button"
              onClick={copy}
              className="flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Copy tracking number"
            >
              {shipment.trackingNumber}
              {copied ? (
                <Check className="h-3 w-3 text-brand" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          ) : (
            <span className="text-xs text-muted-foreground">No tracking number yet</span>
          )}
        </p>
        <Badge variant={exception ? 'destructive' : shipment.status === 'DELIVERED' ? 'success' : 'secondary'}>
          {SHIPMENT_STATUS_LABELS[shipment.status]}
        </Badge>
      </div>

      {!exception && (
        <ol className="flex items-center justify-between">
          {SHIPMENT_JOURNEY.map((stage, i) => {
            const done = i <= journeyIdx;
            return (
              <li key={stage} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
                    done
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground',
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
                </div>
                <span className="text-center text-[11px] leading-tight text-muted-foreground">
                  {SHIPMENT_STATUS_LABELS[stage]}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {shipment.events.length > 0 && (
        <ol className="space-y-3 border-l pl-4">
          {[...shipment.events].reverse().map((event, i) => (
            <li key={`${event.createdAt}-${i}`} className="relative text-sm">
              <span
                className={cn(
                  'absolute -left-[1.3rem] top-1.5 h-2 w-2 rounded-full',
                  i === 0 ? 'bg-brand' : 'bg-border',
                )}
                aria-hidden
              />
              <p className={cn('font-medium', i > 0 && 'text-muted-foreground')}>
                {SHIPMENT_STATUS_LABELS[event.status]}
              </p>
              {event.note ? (
                <p className="text-xs text-muted-foreground">{event.note}</p>
              ) : null}
              <p className="text-xs text-muted-foreground/70">
                {new Date(event.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
