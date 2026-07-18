export enum RateType {
  FLAT = 'FLAT', // fixed price
  WEIGHT = 'WEIGHT', // base + per-kg
  PRICE = 'PRICE', // free above a cart threshold, else base
}

export enum ShipmentStatus {
  CREATED = 'CREATED',
  LABEL_GENERATED = 'LABEL_GENERATED',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETURNED = 'RETURNED',
}

export const SHIPPING_TRACKING_QUEUE = 'shipping-tracking';
export const POLL_TRACKING_JOB = 'poll-tracking';
