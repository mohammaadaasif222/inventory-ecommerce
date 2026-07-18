'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface Zone {
  id: string;
  name: string;
  countries: string[];
  isActive: boolean;
}
export interface Method {
  id: string;
  zoneId: string;
  name: string;
  carrier: string;
  rateType: 'FLAT' | 'WEIGHT' | 'PRICE';
  baseRate: number;
  perKgRate: number;
  freeAbove: number | null;
  estimatedDays: number;
  isActive: boolean;
}

// ── shipment tracking ──
export const SHIPMENT_STATUSES = [
  'CREATED',
  'LABEL_GENERATED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'FAILED',
  'RETURNED',
] as const;
export type ShipmentStatus = (typeof SHIPMENT_STATUSES)[number];

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  CREATED: 'Created',
  LABEL_GENERATED: 'Label generated',
  IN_TRANSIT: 'In transit',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  FAILED: 'Delivery failed',
  RETURNED: 'Returned',
};

/** The happy path, in order — the stepper renders these five. */
export const SHIPMENT_JOURNEY: ShipmentStatus[] = [
  'CREATED',
  'LABEL_GENERATED',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

export interface ShipmentEvent {
  id: string;
  status: ShipmentStatus;
  note: string | null;
  createdAt: string;
}

export interface Shipment {
  id: string;
  orderId: string;
  carrier: string;
  trackingNumber: string | null;
  status: ShipmentStatus;
  createdAt: string;
  updatedAt: string;
  events: ShipmentEvent[];
}

/** Public tracking view — what /track shows anyone with a number. */
export interface PublicTracking {
  carrier: string;
  trackingNumber: string;
  status: ShipmentStatus;
  createdAt: string;
  updatedAt: string;
  events: { status: ShipmentStatus; note: string | null; createdAt: string }[];
}

/** A signed-in customer's shipments for one of their orders. */
export function useOrderShipments(orderId: string, enabled = true) {
  return useQuery({
    queryKey: ['order-shipments', orderId],
    queryFn: () => api.get<Shipment[]>(`/shipping/orders/${orderId}/shipments`),
    enabled: enabled && !!orderId,
  });
}

/** Public track-by-number; enabled once the visitor submits a number. */
export function useTrackShipment(trackingNumber: string | null) {
  return useQuery({
    queryKey: ['track', trackingNumber],
    queryFn: () =>
      api.get<PublicTracking>(`/shipping/track/${encodeURIComponent(trackingNumber!)}`),
    enabled: !!trackingNumber,
    retry: false,
  });
}

/** Admin: all shipments, or one order's. */
export function useShipments(orderId?: string) {
  return useQuery({
    queryKey: ['shipments', orderId ?? 'all'],
    queryFn: () =>
      api.get<Shipment[]>('/shipping/shipments', orderId ? { orderId } : undefined),
  });
}

export function useShipmentMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['shipments'] });
    qc.invalidateQueries({ queryKey: ['order-shipments'] });
  };
  return {
    create: useMutation({
      mutationFn: (body: { orderId: string; carrier: string; trackingNumber?: string }) =>
        api.post<Shipment>('/shipping/shipments', body),
      onSuccess: invalidate,
    }),
    updateStatus: useMutation({
      mutationFn: ({
        id,
        body,
      }: {
        id: string;
        body: { status: ShipmentStatus; trackingNumber?: string; note?: string };
      }) => api.patch<Shipment>(`/shipping/shipments/${id}/status`, body),
      onSuccess: invalidate,
    }),
  };
}

export function useZones() {
  return useQuery({ queryKey: ['zones'], queryFn: () => api.get<Zone[]>('/shipping/zones') });
}
export function useMethods() {
  return useQuery({ queryKey: ['methods'], queryFn: () => api.get<Method[]>('/shipping/methods') });
}

export function useShippingMutations() {
  const qc = useQueryClient();
  const inv = () => {
    qc.invalidateQueries({ queryKey: ['zones'] });
    qc.invalidateQueries({ queryKey: ['methods'] });
  };
  return {
    createZone: useMutation({
      mutationFn: (body: { name: string; countries: string[] }) =>
        api.post<Zone>('/shipping/zones', body),
      onSuccess: inv,
    }),
    createMethod: useMutation({
      mutationFn: (body: {
        zoneId: string;
        name: string;
        carrier?: string;
        rateType: string;
        baseRate?: number;
        estimatedDays?: number;
      }) => api.post<Method>('/shipping/methods', body),
      onSuccess: inv,
    }),
  };
}
